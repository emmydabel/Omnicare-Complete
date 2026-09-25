"""
Central Role-Based Access Control (RBAC).

Every permission class in this file does one job: confirm the authenticated
user's `role` is in an allowed set. Object/queryset-level scoping (e.g. "a
patient may only see their own appointments") is handled separately, inside
each viewset's `get_queryset()` — that's what actually prevents data leakage
between roles, since permission classes alone only gate *endpoint access*,
not *which rows* come back.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission


def role_permission(*roles):
    """Factory: build a permission class that allows only the given roles."""

    class _RolePermission(BasePermission):
        message = f"This action requires one of the following roles: {', '.join(roles)}."

        def has_permission(self, request, view):
            user = request.user
            return bool(user and user.is_authenticated and user.role in roles)

    return _RolePermission


IsAdmin = role_permission("admin")
IsDoctor = role_permission("doctor")
IsNurse = role_permission("nurse")
IsPatient = role_permission("patient")
IsPharmacist = role_permission("pharmacist")

IsClinicalStaff = role_permission("doctor", "nurse")
IsAdminOrClinicalStaff = role_permission("admin", "doctor", "nurse")
IsNonPatientStaff = role_permission("admin", "doctor", "nurse", "pharmacist")


class IsOwnerOrStaff(BasePermission):
    """
    Object-level check for endpoints where a patient should only touch their
    own resource, but any staff role (admin/doctor/nurse/pharmacist) may
    access it for care/operations reasons. Expects the object to expose
    either `.user` directly or `.user_id`, or a `.patient.user_id` chain.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role != "patient":
            return True
        owner_id = getattr(obj, "user_id", None)
        if owner_id is None and hasattr(obj, "patient"):
            owner_id = getattr(obj.patient, "user_id", None)
        return owner_id == user.id


class ReadOnlyOrNonPatientStaff(BasePermission):
    """Anyone authenticated can read (list/retrieve); writes require staff."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return user.role in ("admin", "doctor", "nurse", "pharmacist")
