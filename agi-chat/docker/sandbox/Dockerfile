FROM node:18-alpine

# Create workspace directory
WORKDIR /workspace

# Create non-root user for security
RUN adduser -D -u 1000 sandbox

# Set ownership
RUN chown sandbox:sandbox /workspace

# Switch to non-root user
USER sandbox

# Default command
CMD ["node"]
