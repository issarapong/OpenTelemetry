FROM postgres:15-alpine

# Set environment variables
ENV POSTGRES_DB=testdb
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres

# Copy initialization script
COPY init.sql /docker-entrypoint-initdb.d/

EXPOSE 5432
