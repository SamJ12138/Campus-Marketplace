import io
from datetime import datetime
from uuid import UUID, uuid4

import aioboto3
from botocore.config import Config as BotoConfig
from PIL import Image

from app.config import Settings

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_FORMAT_TO_MIME = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
MAX_IMAGE_DIMENSIONS = (4096, 4096)


class StorageService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.session = aioboto3.Session()

    def _s3_kwargs(self) -> dict:
        return {
            "endpoint_url": self.settings.s3_endpoint_url,
            "aws_access_key_id": self.settings.s3_access_key_id,
            "aws_secret_access_key": self.settings.s3_secret_access_key,
            "region_name": self.settings.s3_region,
            "config": BotoConfig(signature_version="s3v4"),
        }

    async def create_presigned_upload(
        self,
        user_id: UUID,
        purpose: str,
        content_type: str,
        file_size: int,
    ) -> dict:
        """Generate presigned URL for direct S3 upload."""
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise ValueError(f"Invalid content type: {content_type}")

        max_size = (
            self.settings.max_photo_size_bytes
            if purpose == "listing_photo"
            else self.settings.max_avatar_size_bytes
        )
        if file_size > max_size:
            raise ValueError(f"File too large: {file_size} > {max_size}")

        ext = content_type.split("/")[-1]
        if ext == "jpeg":
            ext = "jpg"
        timestamp = datetime.utcnow().strftime("%Y/%m/%d")
        key = f"tmp/{timestamp}/{user_id}/{uuid4()}.{ext}"

        async with self.session.client("s3", **self._s3_kwargs()) as s3:
            url = await s3.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.settings.s3_bucket_name,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=300,
            )

        return {
            "upload_url": url,
            "storage_key": key,
            "expires_in": 300,
        }

    async def validate_and_move_upload(
        self,
        temp_key: str,
        destination_prefix: str,
    ) -> dict:
        """Validate uploaded file and move to permanent location."""
        async with self.session.client("s3", **self._s3_kwargs()) as s3:
            response = await s3.get_object(
                Bucket=self.settings.s3_bucket_name,
                Key=temp_key,
            )
            file_bytes = await response["Body"].read()

            try:
                img = Image.open(io.BytesIO(file_bytes))
                img.verify()
                img = Image.open(io.BytesIO(file_bytes))
                detected_type = _FORMAT_TO_MIME.get(img.format or "", "")
            except Exception as e:
                await s3.delete_object(
                    Bucket=self.settings.s3_bucket_name, Key=temp_key
                )
                raise ValueError(f"Invalid image: {e}")

            if detected_type not in ALLOWED_IMAGE_TYPES:
                await s3.delete_object(
                    Bucket=self.settings.s3_bucket_name, Key=temp_key
                )
                raise ValueError("Invalid file type detected")

            if (
                img.size[0] > MAX_IMAGE_DIMENSIONS[0]
                or img.size[1] > MAX_IMAGE_DIMENSIONS[1]
            ):
                await s3.delete_object(
                    Bucket=self.settings.s3_bucket_name, Key=temp_key
                )
                raise ValueError("Image dimensions too large")

            permanent_key = temp_key.replace("tmp/", f"{destination_prefix}/")
            await s3.copy_object(
                Bucket=self.settings.s3_bucket_name,
                CopySource={
                    "Bucket": self.settings.s3_bucket_name,
                    "Key": temp_key,
                },
                Key=permanent_key,
            )
            await s3.delete_object(
                Bucket=self.settings.s3_bucket_name, Key=temp_key
            )

            return {
                "storage_key": permanent_key,
                "url": f"{self.settings.cdn_url}/{permanent_key}",
                "content_type": detected_type,
                "file_size": len(file_bytes),
                "width": img.size[0],
                "height": img.size[1],
            }

    async def delete_file(self, storage_key: str) -> None:
        """Delete file from S3."""
        async with self.session.client("s3", **self._s3_kwargs()) as s3:
            await s3.delete_object(
                Bucket=self.settings.s3_bucket_name,
                Key=storage_key,
            )
