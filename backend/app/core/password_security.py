"""
Password security utilities including complexity checking and breach detection.
"""
import hashlib
import re
import secrets
import string
from typing import List, Tuple, Optional
import requests
from datetime import datetime, timedelta

# Common weak passwords (top 100 most common)
COMMON_PASSWORDS = {
    "123456", "password", "123456789", "12345678", "12345", "111111", "1234567",
    "sunshine", "qwerty", "iloveyou", "princess", "admin", "welcome", "666666",
    "abc123", "football", "123123", "monkey", "654321", "!@#$%^&*", "charlie",
    "aa123456", "donald", "password1", "qwerty123", "michael", "computer",
    "password123", "letmein", "1234567890", "1234", "login", "0", "password",
    "123", "solo", "passw0rd", "starwars", "dragon", "master", "hello",
    "freedom", "whatever", "qazwsx", "trustno1", "jordan23", "harley",
    "robert", "matthew", "jordan", "asshole", "daniel"
}


class PasswordStrength:
    """Password strength scoring and requirements."""
    
    @staticmethod
    def calculate_entropy(password: str) -> float:
        """Calculate password entropy (bits)."""
        if not password:
            return 0.0
        
        # Character set sizes
        charset_size = 0
        if re.search(r'[a-z]', password):
            charset_size += 26
        if re.search(r'[A-Z]', password):
            charset_size += 26
        if re.search(r'[0-9]', password):
            charset_size += 10
        if re.search(r'[^a-zA-Z0-9]', password):
            charset_size += 32  # Approximate special characters
        
        if charset_size == 0:
            return 0.0
        
        import math
        return len(password) * math.log2(charset_size)
    
    @staticmethod
    def check_complexity(password: str) -> Tuple[bool, List[str]]:
        """
        Check password complexity requirements.
        Returns (is_valid, list_of_errors)
        """
        errors = []
        
        # Length requirement
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if len(password) > 128:
            errors.append("Password must be no more than 128 characters long")
        
        # Character variety requirements
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[0-9]', password):
            errors.append("Password must contain at least one number")
        
        if not re.search(r'[^a-zA-Z0-9]', password):
            errors.append("Password must contain at least one special character")
        
        # Common patterns to avoid
        if re.search(r'(.)\1{2,}', password):  # 3+ consecutive same characters
            errors.append("Password cannot contain 3 or more consecutive identical characters")
        
        if re.search(r'(012|123|234|345|456|567|678|789|890)', password):
            errors.append("Password cannot contain sequential numbers")
        
        if re.search(r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)', password.lower()):
            errors.append("Password cannot contain sequential letters")
        
        # Check against common passwords
        if password.lower() in COMMON_PASSWORDS:
            errors.append("Password is too common and easily guessable")
        
        # Entropy check (minimum 40 bits)
        entropy = PasswordStrength.calculate_entropy(password)
        if entropy < 40:
            errors.append("Password is not complex enough (low entropy)")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def get_strength_score(password: str) -> Tuple[int, str]:
        """
        Get password strength score (0-100) and description.
        Returns (score, description)
        """
        if not password:
            return 0, "No password"
        
        score = 0
        
        # Length scoring (0-30 points)
        length = len(password)
        if length >= 8:
            score += min(30, length * 2)
        
        # Character variety (0-40 points)
        varieties = 0
        if re.search(r'[a-z]', password):
            varieties += 1
        if re.search(r'[A-Z]', password):
            varieties += 1
        if re.search(r'[0-9]', password):
            varieties += 1
        if re.search(r'[^a-zA-Z0-9]', password):
            varieties += 1
        
        score += varieties * 10
        
        # Entropy bonus (0-30 points)
        entropy = PasswordStrength.calculate_entropy(password)
        if entropy >= 60:
            score += 30
        elif entropy >= 40:
            score += 20
        elif entropy >= 25:
            score += 10
        
        # Penalty for common patterns
        if password.lower() in COMMON_PASSWORDS:
            score = max(0, score - 30)
        
        if re.search(r'(.)\1{2,}', password):
            score = max(0, score - 10)
        
        # Ensure score is between 0-100
        score = min(100, max(0, score))
        
        # Description based on score
        if score >= 80:
            description = "Very Strong"
        elif score >= 60:
            description = "Strong"
        elif score >= 40:
            description = "Moderate"
        elif score >= 20:
            description = "Weak"
        else:
            description = "Very Weak"
        
        return score, description


class PasswordBreachChecker:
    """Check passwords against known data breaches using HaveIBeenPwned API."""
    
    HIBP_API_URL = "https://api.pwnedpasswords.com/range/"
    
    @staticmethod
    def check_breach(password: str, timeout: int = 5) -> Tuple[bool, int]:
        """
        Check if password has been in a data breach.
        Returns (is_breached, occurrence_count)
        """
        if not password:
            return False, 0
        
        try:
            # Hash the password using SHA-1
            sha1_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()
            prefix = sha1_hash[:5]
            suffix = sha1_hash[5:]
            
            # Query HaveIBeenPwned API
            response = requests.get(
                f"{PasswordBreachChecker.HIBP_API_URL}{prefix}",
                timeout=timeout,
                headers={"User-Agent": "Kubrick-Password-Checker"}
            )
            
            if response.status_code == 200:
                # Parse response to find our hash
                for line in response.text.splitlines():
                    hash_suffix, count = line.split(':')
                    if hash_suffix == suffix:
                        return True, int(count)
                
                return False, 0  # Not found in breaches
            
            elif response.status_code == 429:
                # Rate limited, assume safe for now
                return False, 0
            
            else:
                # API error, assume safe for now
                return False, 0
        
        except Exception:
            # Network error or other issue, assume safe
            return False, 0


def generate_secure_password(length: int = 16) -> str:
    """Generate a cryptographically secure password."""
    if length < 8:
        length = 8
    
    # Ensure we have at least one of each character type
    password_chars = []
    
    # Add required character types
    password_chars.append(secrets.choice(string.ascii_lowercase))
    password_chars.append(secrets.choice(string.ascii_uppercase))
    password_chars.append(secrets.choice(string.digits))
    password_chars.append(secrets.choice("!@#$%^&*()_+-=[]{}|;:,.<>?"))
    
    # Fill the rest with random characters
    all_chars = string.ascii_letters + string.digits + "!@#$%^&*()_+-=[]{}|;:,.<>?"
    for _ in range(length - 4):
        password_chars.append(secrets.choice(all_chars))
    
    # Shuffle the password
    secrets.SystemRandom().shuffle(password_chars)
    
    return ''.join(password_chars)


def validate_password_security(password: str, check_breaches: bool = True) -> Tuple[bool, List[str]]:
    """
    Comprehensive password validation including complexity and breach checking.
    Returns (is_valid, list_of_errors)
    """
    errors = []
    
    # Check complexity
    is_complex, complexity_errors = PasswordStrength.check_complexity(password)
    errors.extend(complexity_errors)
    
    # Check against known breaches (if enabled)
    if check_breaches:
        try:
            is_breached, count = PasswordBreachChecker.check_breach(password)
            if is_breached:
                if count > 100:
                    errors.append(f"Password has been found in {count} data breaches and is highly compromised")
                else:
                    errors.append(f"Password has been found in {count} data breach(es)")
        except Exception:
            # If breach checking fails, continue with other validations
            pass
    
    return len(errors) == 0, errors