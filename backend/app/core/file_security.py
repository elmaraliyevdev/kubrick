"""
File upload security and validation utilities.
"""
import os
import mimetypes
try:
    import magic
except ImportError:  # pragma: no cover - depends on host libmagic installation
    magic = None
import hashlib
import tempfile
from typing import List, Tuple, Optional, Dict, Any
from pathlib import Path
from fastapi import UploadFile
from PIL import Image
import io

# Maximum file sizes (in bytes)
MAX_FILE_SIZES = {
    'image': 10 * 1024 * 1024,    # 10MB for images
    'document': 50 * 1024 * 1024,  # 50MB for documents
    'default': 10 * 1024 * 1024    # 10MB default
}

# Allowed MIME types and extensions
ALLOWED_MIME_TYPES = {
    # Images
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    
    # Documents
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    
    # Archives (if needed)
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar'],
}

# Dangerous file extensions that should never be allowed
DANGEROUS_EXTENSIONS = {
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar',
    '.app', '.deb', '.pkg', '.dmg', '.sh', '.php', '.asp', '.aspx', '.jsp'
}

# Magic bytes for common file types (for additional validation)
FILE_MAGIC_BYTES = {
    'pdf': [b'%PDF'],
    'jpeg': [b'\xff\xd8\xff'],
    'png': [b'\x89PNG\r\n\x1a\n'],
    'gif': [b'GIF87a', b'GIF89a'],
    'zip': [b'PK\x03\x04', b'PK\x05\x06', b'PK\x07\x08'],
    'docx': [b'PK\x03\x04'],  # DOCX is ZIP-based
    'doc': [b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'],
}


class FileValidationError(Exception):
    """Custom exception for file validation errors."""
    pass


class FileSecurityValidator:
    """Comprehensive file security validation."""
    
    @staticmethod
    def validate_filename(filename: str) -> Tuple[bool, str]:
        """
        Validate filename for security issues.
        Returns (is_valid, sanitized_filename)
        """
        if not filename:
            raise FileValidationError("Filename cannot be empty")
        
        # Remove path traversal attempts
        filename = os.path.basename(filename)
        
        # Remove or replace dangerous characters
        dangerous_chars = '<>:"|?*\x00-\x1f'
        for char in dangerous_chars:
            filename = filename.replace(char, '_')
        
        # Check for dangerous extensions
        ext = Path(filename).suffix.lower()
        if ext in DANGEROUS_EXTENSIONS:
            raise FileValidationError(f"File type '{ext}' is not allowed for security reasons")
        
        # Limit filename length
        if len(filename) > 255:
            name_part, ext_part = os.path.splitext(filename)
            max_name_len = 255 - len(ext_part)
            filename = f"{name_part[:max_name_len]}{ext_part}"
        
        # Ensure filename doesn't start with dot (hidden files)
        if filename.startswith('.'):
            filename = f"file_{filename[1:]}"
        
        return True, filename
    
    @staticmethod
    def validate_file_type(file_content: bytes, filename: str) -> Tuple[bool, str]:
        """
        Validate file type using both extension and magic bytes.
        Returns (is_valid, detected_mime_type)
        """
        # Get file extension
        ext = Path(filename).suffix.lower()
        
        # Use python-magic to detect MIME type from content
        if magic is not None:
            try:
                detected_mime = magic.from_buffer(file_content, mime=True)
            except Exception:
                detected_mime = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        else:
            detected_mime = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        
        # Check if detected MIME type is allowed
        if detected_mime not in ALLOWED_MIME_TYPES:
            raise FileValidationError(f"File type '{detected_mime}' is not allowed")
        
        # Verify extension matches detected type
        allowed_extensions = ALLOWED_MIME_TYPES[detected_mime]
        if ext not in allowed_extensions:
            raise FileValidationError(
                f"File extension '{ext}' doesn't match detected type '{detected_mime}'"
            )
        
        return True, detected_mime
    
    @staticmethod
    def validate_file_size(file_size: int, file_type: str = 'default') -> bool:
        """Validate file size based on type."""
        max_size = MAX_FILE_SIZES.get(file_type, MAX_FILE_SIZES['default'])
        
        if file_size > max_size:
            raise FileValidationError(
                f"File size ({file_size} bytes) exceeds maximum allowed size ({max_size} bytes)"
            )
        
        return True
    
    @staticmethod
    def validate_image_content(image_data: bytes) -> bool:
        """Additional validation for image files."""
        try:
            # Try to open and verify the image
            with Image.open(io.BytesIO(image_data)) as img:
                # Check for reasonable dimensions
                width, height = img.size
                if width > 10000 or height > 10000:
                    raise FileValidationError("Image dimensions too large")
                
                if width < 1 or height < 1:
                    raise FileValidationError("Invalid image dimensions")
                
                # Verify the image can be processed
                img.verify()
            
            return True
            
        except Exception as e:
            raise FileValidationError(f"Invalid image file: {str(e)}")
    
    @staticmethod
    def scan_for_malware_signatures(file_content: bytes) -> bool:
        """Basic malware signature detection."""
        # Simple signature-based detection for common threats
        malware_signatures = [
            # JavaScript/VBScript in documents
            b'<script',
            b'javascript:',
            b'vbscript:',
            
            # Executable headers
            b'MZ\x90\x00',  # PE executable
            b'\x7fELF',     # ELF executable
            
            # Suspicious strings
            b'cmd.exe',
            b'powershell',
            b'eval(',
            b'system(',
        ]
        
        content_lower = file_content.lower()
        for signature in malware_signatures:
            if signature in content_lower:
                raise FileValidationError("File contains suspicious content")
        
        return True
    
    @staticmethod
    def calculate_file_hash(file_content: bytes) -> str:
        """Calculate SHA-256 hash of file content."""
        return hashlib.sha256(file_content).hexdigest()
    
    @staticmethod
    async def validate_upload_file(file: UploadFile) -> Dict[str, Any]:
        """
        Comprehensive validation of uploaded file.
        Returns validation results and metadata.
        """
        if not file:
            raise FileValidationError("No file provided")
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Reset file pointer
        await file.seek(0)
        
        # Validate filename
        is_valid_name, sanitized_filename = FileSecurityValidator.validate_filename(file.filename)
        
        # Validate file type
        is_valid_type, mime_type = FileSecurityValidator.validate_file_type(file_content, sanitized_filename)
        
        # Determine file category
        file_category = 'default'
        if mime_type.startswith('image/'):
            file_category = 'image'
        elif mime_type in ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
            file_category = 'document'
        
        # Validate file size
        FileSecurityValidator.validate_file_size(file_size, file_category)
        
        # Additional validation for images
        if file_category == 'image':
            FileSecurityValidator.validate_image_content(file_content)
        
        # Malware scanning
        FileSecurityValidator.scan_for_malware_signatures(file_content)
        
        # Calculate file hash
        file_hash = FileSecurityValidator.calculate_file_hash(file_content)
        
        return {
            'original_filename': file.filename,
            'sanitized_filename': sanitized_filename,
            'mime_type': mime_type,
            'file_category': file_category,
            'file_size': file_size,
            'file_hash': file_hash,
            'is_valid': True
        }


def create_secure_filename(original_filename: str, user_id: int) -> str:
    """Create a secure filename for storage."""
    # Get sanitized filename
    _, sanitized = FileSecurityValidator.validate_filename(original_filename)
    
    # Add timestamp and user ID for uniqueness
    import time
    timestamp = int(time.time())
    
    name_part, ext_part = os.path.splitext(sanitized)
    secure_filename = f"{user_id}_{timestamp}_{name_part}{ext_part}"
    
    return secure_filename


def get_safe_file_path(base_path: str, filename: str) -> str:
    """Get a safe file path that prevents directory traversal."""
    # Ensure base path exists and is absolute
    base_path = os.path.abspath(base_path)
    
    # Remove any path components from filename
    safe_filename = os.path.basename(filename)
    
    # Join with base path
    file_path = os.path.join(base_path, safe_filename)
    
    # Ensure the final path is within the base directory
    if not os.path.abspath(file_path).startswith(base_path):
        raise FileValidationError("Invalid file path")
    
    return file_path
