#!/bin/bash
# ============================================================
# FreightClaims v5.0 - LocalStack S3 Initialization
# ============================================================
# Creates the S3 buckets used by the app when LocalStack starts.
# ============================================================

echo "Creating S3 buckets..."

awslocal s3 mb s3://freightclaims-documents
awslocal s3 mb s3://freightclaims-aibot

echo "S3 buckets created:"
awslocal s3 ls
