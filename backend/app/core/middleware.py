from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

class ContentSizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_upload_size: int = 2_000_000): # 2MB
        super().__init__(app)
        self.max_upload_size = max_upload_size

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get('content-length')
        if content_length:
            if int(content_length) > self.max_upload_size:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Payload too large. Max size allows is {self.max_upload_size} bytes."}
                )
        return await call_next(request)
