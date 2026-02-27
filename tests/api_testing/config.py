"""Configuration for API testing system."""
import os
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Dict, Any


@dataclass
class Config:
    """Configuration for automated API testing system."""
    
    # Backend settings
    base_url: str = "http://localhost:5003"
    openapi_file: str = "openapi.yaml"
    
    # Authentication
    admin_email: str = "admin@x-ear.com"
    admin_password: str = "admin123"
    
    # Request settings
    timeout: int = 45  # Balanced timeout for backend
    connect_timeout: int = 10  # Connection timeout
    max_retries: int = 5  # Retry count for transient failures
    request_delay: float = 0.0  # No delay between requests
    
    # Output settings
    output_report: Optional[str] = None
    failed_log: str = "failed_endpoints.txt"
    verbose: bool = False
    
    # Execution settings
    parallel: bool = False
    
    @classmethod
    def from_env(cls) -> "Config":
        """Create config from environment variables."""
        return cls(
            base_url=os.getenv("API_BASE_URL", "http://localhost:5003"),
            openapi_file=os.getenv("OPENAPI_FILE", "openapi.yaml"),
            admin_email=os.getenv("ADMIN_EMAIL", "admin@x-ear.com"),
            admin_password=os.getenv("ADMIN_PASSWORD", "admin123"),
            timeout=int(os.getenv("API_TIMEOUT", "45")),
            connect_timeout=int(os.getenv("API_CONNECT_TIMEOUT", "10")),
            max_retries=int(os.getenv("API_MAX_RETRIES", "5")),
            request_delay=float(os.getenv("API_REQUEST_DELAY", "0.0")),
            output_report=os.getenv("OUTPUT_REPORT"),
            failed_log=os.getenv("FAILED_LOG", "failed_endpoints.txt"),
            verbose=os.getenv("VERBOSE", "false").lower() == "true",
            parallel=os.getenv("PARALLEL", "false").lower() == "true",
        )
    
    @classmethod
    def from_file(cls, config_file: str) -> "Config":
        """
        Load configuration from YAML or JSON file.
        
        Args:
            config_file: Path to config file (.yaml, .yml, or .json)
            
        Returns:
            Config instance with values from file
            
        Raises:
            FileNotFoundError: If config file doesn't exist
            ValueError: If file format is not supported
        """
        path = Path(config_file)
        
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {config_file}")
        
        # Determine file format
        suffix = path.suffix.lower()
        
        if suffix in ['.yaml', '.yml']:
            try:
                import yaml
            except ImportError:
                raise ImportError("PyYAML is required for YAML config files. Install with: pip install pyyaml")
            
            with open(path, 'r') as f:
                data = yaml.safe_load(f)
        
        elif suffix == '.json':
            with open(path, 'r') as f:
                data = json.load(f)
        
        else:
            raise ValueError(f"Unsupported config file format: {suffix}. Use .yaml, .yml, or .json")
        
        # Create config from data
        return cls(**data)
    
    @classmethod
    def from_file_with_overrides(cls, config_file: Optional[str] = None, **overrides) -> "Config":
        """
        Load config from file and apply CLI argument overrides.
        
        Priority: CLI args > config file > environment > defaults
        
        Args:
            config_file: Optional path to config file
            **overrides: CLI argument overrides
            
        Returns:
            Config instance with merged values
        """
        # Start with defaults
        if config_file:
            config = cls.from_file(config_file)
        else:
            config = cls.from_env()
        
        # Apply overrides (only non-None values)
        for key, value in overrides.items():
            if value is not None and hasattr(config, key):
                setattr(config, key, value)
        
        return config
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return {
            'base_url': self.base_url,
            'openapi_file': self.openapi_file,
            'admin_email': self.admin_email,
            'admin_password': '***',  # Mask password
            'timeout': self.timeout,
            'connect_timeout': self.connect_timeout,
            'max_retries': self.max_retries,
            'request_delay': self.request_delay,
            'output_report': self.output_report,
            'failed_log': self.failed_log,
            'verbose': self.verbose,
            'parallel': self.parallel,
        }
    
    def save_to_file(self, config_file: str):
        """
        Save configuration to YAML or JSON file.
        
        Args:
            config_file: Path to save config (.yaml, .yml, or .json)
        """
        path = Path(config_file)
        suffix = path.suffix.lower()
        
        # Get dict without masked password
        data = {
            'base_url': self.base_url,
            'openapi_file': self.openapi_file,
            'admin_email': self.admin_email,
            'admin_password': self.admin_password,
            'timeout': self.timeout,
            'connect_timeout': self.connect_timeout,
            'max_retries': self.max_retries,
            'request_delay': self.request_delay,
            'output_report': self.output_report,
            'failed_log': self.failed_log,
            'verbose': self.verbose,
            'parallel': self.parallel,
        }
        
        if suffix in ['.yaml', '.yml']:
            try:
                import yaml
            except ImportError:
                raise ImportError("PyYAML is required for YAML config files. Install with: pip install pyyaml")
            
            with open(path, 'w') as f:
                yaml.dump(data, f, default_flow_style=False)
        
        elif suffix == '.json':
            with open(path, 'w') as f:
                json.dump(data, f, indent=2)
        
        else:
            raise ValueError(f"Unsupported config file format: {suffix}. Use .yaml, .yml, or .json")
