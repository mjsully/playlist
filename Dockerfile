# --- Stage 1: Build the Go application ---
FROM golang:1.26-alpine AS builder

# Install SSL certificates and timezone files in the builder stage
RUN apk update && apk add --no-cache ca-certificates tzdata

# Set the current working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum files first to leverage Docker caching for dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the Go binary statically linked
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o main .

# --- Stage 2: Final lightweight execution environment ---
FROM scratch

LABEL org.opencontainers.image.source=https://github.com/mjsully/playlist-api 

# 1. Copy SSL certificates so HTTPS calls work out of the scratch box
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# 2. Copy the compiled binary from the builder stage
COPY --from=builder /app/main /main

# 3. Copy only the assets needed at runtime (like web templates)
COPY web /web

# Expose the port your application listens on
EXPOSE 8080

# Run the binary
ENTRYPOINT ["/main"]