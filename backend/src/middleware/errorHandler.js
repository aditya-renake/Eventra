export const errorHandler = (err, req, res, next) => {
  console.error(JSON.stringify({ event: 'request_error', requestId: req.requestId, code: err.code || 'INTERNAL_ERROR' }));

  const statusCode = Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode <= 599 ? err.statusCode : 500;
  const message = statusCode < 500 ? (err.message || 'Request failed') : 'The service is temporarily unavailable. Please try again.';

  res.status(statusCode).json({
    success: false,
    message,
    code: err.code || 'INTERNAL_ERROR',
    requestId: req.requestId,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
