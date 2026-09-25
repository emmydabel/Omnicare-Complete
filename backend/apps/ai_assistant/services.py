"""
ARIA — OMNICARE's AI Healthcare Assistant.

Talks directly to the Gemini Developer API via the official `google-genai`
SDK — no LangChain or third-party agent framework. Conversation memory is
"native": every request rebuilds the `contents` array from this app's own
ChatMessage rows (the database *is* the memory store) and forwards that
rolling window to Gemini. Gemini itself is called statelessly — it has no
memory of past `generate_content` calls, so nothing is lost by doing it this
way, and it keeps OMNICARE in full control of retention, redaction, and the
per-role system prompt.
"""
import logging
import re

from django.conf import settings

logger = logging.getLogger("apps.ai_assistant")

# Rolling window: how many prior messages (both roles combined) ride along on
# every request. Bounds latency/cost while keeping enough context for a
# coherent conversation. 20 messages ≈ 10 conversational turns.
MAX_HISTORY_MESSAGES = 20

MODEL_NAME = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash")

# A conservative, non-exhaustive safety net. This is deliberately simple
# pattern matching, not a diagnostic tool — it exists purely to force a
# message into the "urgent" lane (surfaced to staff, shown with an emergency
# banner to patients) even if the model's own reply doesn't flag it clearly.
URGENT_PATTERNS = [
    r"\bchest pain\b", r"\bcan'?t breathe\b", r"\bdifficulty breathing\b",
    r"\bsevere bleeding\b", r"\buncontrolled bleeding\b", r"\bstroke\b",
    r"\bface (is |)drooping\b", r"\bslurred speech\b", r"\bunconscious\b",
    r"\bnot breathing\b", r"\bsevere allergic reaction\b", r"\banaphylax",
    r"\bsuicidal\b", r"\bkill myself\b", r"\bend my life\b", r"\bsevere abdominal pain\b",
    r"\bcoughing (up |)blood\b", r"\bseizure\b", r"\bhead injury\b", r"\boverdose\b",
]
_URGENT_RE = re.compile("|".join(URGENT_PATTERNS), re.IGNORECASE)

CRISIS_NOTICE = (
    "\n\n⚠ If this is a medical emergency, call your local emergency number "
    "immediately or go to the nearest emergency department. If you're in "
    "crisis or having thoughts of harming yourself, the 988 Suicide & Crisis "
    "Lifeline (call or text 988 in the US) is available 24/7."
)

SYSTEM_INSTRUCTIONS = {
    "patient": (
        "You are ARIA, OMNICARE hospital's AI health assistant, speaking directly "
        "with a patient. You can: explain symptoms in plain language, help the "
        "patient understand what level of care they might need (self-care / "
        "schedule a visit / urgent care / emergency), explain medical terms from "
        "their own records in plain English, and help them prepare questions for "
        "their doctor. You must NOT: diagnose conditions, prescribe or adjust "
        "medication, or tell the patient to stop a treatment their doctor "
        "prescribed. Always be warm, clear, and brief. If symptoms sound "
        "potentially serious or urgent, say so plainly and recommend they seek "
        "in-person care promptly, and mention emergency services if it could be "
        "life-threatening. Never present yourself as a replacement for their "
        "care team."
    ),
    "doctor": (
        "You are ARIA, OMNICARE hospital's AI clinical assistant, speaking with a "
        "physician. You can act as a fast reference and documentation aid: "
        "summarize patient records that are provided to you in context, help "
        "draft clinical notes from bullet points, discuss differential "
        "considerations and general clinical reference information, and surface "
        "anything in the provided context that looks urgent or inconsistent. "
        "You are a decision-support tool, not the decision-maker — the physician "
        "retains full clinical judgment and responsibility. Be precise and "
        "concise; use clinical terminology freely."
    ),
    "nurse": (
        "You are ARIA, OMNICARE hospital's AI clinical assistant, speaking with a "
        "nurse. Help with quick reference lookups, summarizing patient context "
        "provided to you, vitals-trend interpretation, and flagging anything "
        "that looks like it needs escalation to a physician. You are a "
        "decision-support tool, not a substitute for clinical judgment or "
        "physician orders. Be precise and concise."
    ),
    "pharmacist": (
        "You are ARIA, OMNICARE hospital's AI clinical assistant, speaking with a "
        "pharmacist. Help with medication reference information, general "
        "drug-interaction and contraindication awareness, and dosage-form "
        "questions. You are a reference aid, not a substitute for the "
        "pharmacist's own verification against the patient's full chart and "
        "professional judgment. Be precise and concise."
    ),
    "admin": (
        "You are ARIA, OMNICARE hospital's AI assistant, speaking with hospital "
        "administrative staff. Help with operational questions about the "
        "system, summarizing data provided to you in context, and general "
        "hospital-operations reference questions. You do not have access to "
        "make changes to records yourself — you can only discuss what's given "
        "to you in context."
    ),
}

# Appended to every role's prompt above (not a standalone entry — every
# lookup in send_message() concatenates this on). Closes a real gap: nothing
# previously stopped the model from honestly answering "yes, I'm Gemini" if
# asked, which would defeat the point of de-branding the UI. This does NOT
# instruct the model to deny being an AI, or to lie about its capabilities —
# only to keep the specific vendor/model out of the conversation, the same
# way many products don't disclose their specific infrastructure providers.
MODEL_PRIVACY_INSTRUCTION = (
    "\n\nIf asked what AI model, company, or technology powers you: you are "
    "ARIA, OMNICARE's own AI assistant — do not confirm, deny, or speculate "
    "about any specific underlying model or vendor, even if asked directly "
    "or persistently. You may say you're an AI assistant built for OMNICARE "
    "if that's relevant, but the specific technology behind you isn't "
    "something you discuss. Don't be cagey or evasive about it beyond a "
    "brief, friendly redirect back to how you can help."
)
SYSTEM_INSTRUCTIONS = {role: prompt + MODEL_PRIVACY_INSTRUCTION for role, prompt in SYSTEM_INSTRUCTIONS.items()}

FALLBACK_REPLY = (
    "I'm having trouble reaching the AI service right now, so I can't respond "
    "properly to that. Please try again in a moment. If this is urgent, please "
    "contact your care team directly rather than waiting on me."
)


def detect_urgent(text: str) -> bool:
    return bool(_URGENT_RE.search(text or ""))


def _patient_context_block(patient_profile) -> str:
    """Serializes a compact clinical snapshot for a patient into plain text,
    used to ground ARIA when clinical staff ask it to summarize a chart. Kept
    deliberately short (most-recent-first, capped) to control token usage."""
    lines = [
        f"PATIENT CONTEXT for {patient_profile.user.get_full_name()} "
        f"(ID {patient_profile.patient_id}, {patient_profile.get_gender_display() or 'gender not recorded'}, "
        f"age {patient_profile.age if patient_profile.age is not None else 'unknown'}):",
        f"Blood group: {patient_profile.blood_group}. Admission status: {patient_profile.get_admission_status_display()}.",
    ]

    allergies = list(patient_profile.allergies.all()[:10])
    if allergies:
        lines.append("Allergies: " + "; ".join(f"{a.allergen} ({a.severity})" for a in allergies))
    else:
        lines.append("Allergies: none recorded.")

    records = list(patient_profile.medical_records.all()[:5])
    if records:
        lines.append("Recent medical record entries:")
        for r in records:
            lines.append(
                f"  - {r.visit_date} [{r.get_record_type_display()}] "
                f"Diagnosis: {r.diagnosis or '—'}; Plan: {r.treatment_plan or '—'}"
            )

    vitals = patient_profile.vital_signs.first()
    if vitals:
        lines.append(
            f"Most recent vitals ({vitals.recorded_at:%Y-%m-%d %H:%M}): "
            f"HR {vitals.heart_rate or '—'} bpm, BP "
            f"{vitals.blood_pressure_systolic or '—'}/{vitals.blood_pressure_diastolic or '—'} mmHg, "
            f"Temp {vitals.temperature_celsius or '—'}°C, SpO2 {vitals.oxygen_saturation or '—'}%"
            + (" — FLAGGED CRITICAL" if vitals.is_critical else "")
        )

    prescriptions = list(patient_profile.prescriptions.all()[:5])
    if prescriptions:
        lines.append("Recent prescriptions: " + "; ".join(p.prescription_id for p in prescriptions))

    return "\n".join(lines)


class AriaService:
    """Thin wrapper around the Gemini API for one chat turn."""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            from google import genai

            if not settings.GEMINI_API_KEY:
                raise RuntimeError(
                    "GEMINI_API_KEY is not set. Add it to backend/.env — see .env.example."
                )
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    def _build_contents(self, session, new_message_text, patient_profile=None):
        from .models import ChatMessage

        history = list(
            session.messages.order_by("-created_at")[:MAX_HISTORY_MESSAGES]
        )[::-1]

        contents = [
            {"role": m.role, "parts": [{"text": m.content}]}
            for m in history
        ]

        user_turn_text = new_message_text
        if patient_profile is not None:
            context_block = _patient_context_block(patient_profile)
            user_turn_text = f"{context_block}\n\n---\nStaff question: {new_message_text}"

        contents.append({"role": ChatMessage.Role.USER, "parts": [{"text": user_turn_text}]})
        return contents

    def send_message(self, *, session, user, message_text, patient_profile=None) -> "ChatMessage":
        """Persists the user's message, calls Gemini with the rolling history,
        persists and returns ARIA's reply as a ChatMessage."""
        from google.genai import types

        from .models import ChatMessage

        user_is_urgent = detect_urgent(message_text)

        # Build the Gemini `contents` array from history that's already in the
        # database, then persist the new user message — in that order, so the
        # message being sent right now isn't double-counted (it's appended to
        # `contents` explicitly by _build_contents, not queried from the DB).
        contents = self._build_contents(session, message_text, patient_profile=patient_profile)
        ChatMessage.objects.create(
            session=session, role=ChatMessage.Role.USER, content=message_text, is_urgent=user_is_urgent
        )

        system_instruction = SYSTEM_INSTRUCTIONS.get(user.role, SYSTEM_INSTRUCTIONS["patient"])

        try:
            response = self.client.models.generate_content(
                model=MODEL_NAME,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.4,
                    max_output_tokens=1024,
                ),
            )
            reply_text = (response.text or "").strip() or (
                "I don't have a good answer for that — could you rephrase or give me a bit more detail?"
            )
        except Exception:
            logger.exception("Gemini API call failed for session %s", session.pk)
            reply_text = FALLBACK_REPLY

        reply_is_urgent = user_is_urgent or detect_urgent(reply_text)
        if reply_is_urgent and user.role == "patient" and CRISIS_NOTICE.strip() not in reply_text:
            reply_text = f"{reply_text}{CRISIS_NOTICE}"

        assistant_message = ChatMessage.objects.create(
            session=session, role=ChatMessage.Role.MODEL, content=reply_text, is_urgent=reply_is_urgent
        )

        # Give brand-new sessions a sensible title derived from the first message.
        if session.title == "New Conversation":
            session.title = message_text[:60] + ("…" if len(message_text) > 60 else "")
        session.save(update_fields=["title", "updated_at"])

        return assistant_message


aria_service = AriaService()
