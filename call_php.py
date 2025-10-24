import subprocess
import os

def run_php_script(script_path, args=None):
    try:
        # Path to XAMPP PHP executable (adjust if your XAMPP is installed elsewhere)
        php_path = r'C:\xampp\php\php.exe'
        
        # Make script path absolute if it's relative
        if not os.path.isabs(script_path):
            script_path = os.path.join(os.path.dirname(__file__), script_path)
        
        cmd = [php_path, script_path]
        if args:
            cmd.extend(args)
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=30
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        return f"Error: {e.stderr}"
    except subprocess.TimeoutExpired:
        return "Error: PHP script timed out"
    except FileNotFoundError:
        return "Error: PHP not found. Make sure XAMPP is installed at C:\\xampp"