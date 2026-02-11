class AppException(Exception):  # noqa: N818
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: str = "error",
    ):
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(self.message)


class NotFoundError(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            message=f"{resource} not found",
            status_code=404,
            code="not_found",
        )


class ForbiddenError(AppException):
    def __init__(self, message: str = "Access denied"):
        super().__init__(message=message, status_code=403, code="forbidden")


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Not authenticated"):
        super().__init__(message=message, status_code=401, code="unauthorized")


class ConflictError(AppException):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(message=message, status_code=409, code="conflict")


class RateLimitError(AppException):
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        self.retry_after = retry_after
        super().__init__(message=message, status_code=429, code="rate_limit")


class ValidationError(AppException):
    def __init__(self, message: str):
        super().__init__(message=message, status_code=422, code="validation_error")
