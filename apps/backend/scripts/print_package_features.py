import json

def get_package_features():
    """
    Defines the features available for each package.
    """
    return {
        "standart": {
            "features": [
                "Patient Management (Basic)",
                "Appointment Scheduling (Basic)",
                "Device Management (Basic)",
                "Basic Reporting",
                "Campaign Management (Basic)"
            ],
            "demo_limitations": "Limited to 10 patients and 5 appointments."
        },
        "profesyonel": {
            "features": [
                "All features from 'standart'",
                "Advanced Patient Management",
                "Advanced Appointment Scheduling",
                "Device Stock Management",
                "Advanced Reporting",
                "Campaign Management (Advanced)",
                "Automation (Basic)"
            ],
            "demo_limitations": "Limited to 25 patients and 15 appointments."
        },
        "kurumsal": {
            "features": [
                "All features from 'profesyonel'",
                "SGK Integration",
                "E-Invoice Integration",
                "Advanced Automation",
                "Corporate Reporting",
                "Multi-user Support"
            ],
            "demo_limitations": "Full features, but with a time limit (e.g., 14 days)."
        }
    }

if __name__ == "__main__":
    packages = get_package_features()
    print(packages)