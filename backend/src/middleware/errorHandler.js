export function errorHandler(err, _req, res, _next) {
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      error: err.issues?.[0]?.message || 'Invalid request payload.'
    });
  }

  const status = err.statusCode || 500;
  const message = err.expose ? err.message : 'Internal server error';

  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  res.status(status).json({
    error: message
  });
}

export function createHttpError(statusCode, message, expose = true) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = expose;
  return error;
}
