from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize global rate limiter with a forgiving default for authenticated sessions
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
