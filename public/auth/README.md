# Auth background asset placeholder

`login-bg.png` is intentionally excluded from this PR because binary files are not supported by the CODEX PR pipeline.

For production, add the background image manually at:

- `public/auth/login-bg.png`

The login page code keeps using `src="/auth/login-bg.png"` and includes a gradient/color fallback so the UI still renders if this file is missing.
