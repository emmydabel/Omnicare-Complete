from rest_framework.views import exception_handler


def omnicare_exception_handler(exc, context):
    """
    Wrap DRF's default exception handling so every error response has the
    same predictable shape: {"detail": "...", "errors": {...} | null}.
    Makes frontend error handling uniform across every endpoint.
    """
    response = exception_handler(exc, context)
    if response is None:
        return response

    data = response.data
    if isinstance(data, dict) and "detail" in data and len(data) == 1:
        response.data = {"detail": data["detail"], "errors": None}
    else:
        response.data = {"detail": "Request failed validation.", "errors": data}
    return response
