import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def make_fake_npm(directory: Path) -> None:
    script = directory / "npm"
    script.write_text("#!/usr/bin/env bash\necho FAKE_NPM \"$@\"\n")
    script.chmod(0o755)


def run_command(command, env=None):
    return subprocess.run(
        command,
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )


class CliLauncherTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.fake_bin = Path(self.temp_dir.name)
        make_fake_npm(self.fake_bin)
        self.base_env = os.environ.copy()
        self.base_env["PATH"] = f"{self.fake_bin}{os.pathsep}{self.base_env.get('PATH', '')}"

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_bash_launcher_default_listener(self):
        result = run_command(["./cli_launcher.sh"], env=self.base_env)
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        self.assertIn("Selected tool: listen", result.stdout)
        self.assertIn("ADA Scanner Listener Launcher", result.stdout)
        self.assertIn("FAKE_NPM --prefix", result.stdout)
        self.assertIn("run start", result.stdout)

    def test_bash_launcher_sca_args(self):
        result = run_command(
            ["./cli_launcher.sh", "--tool", "sca", "--", "--config", "config.json"],
            env=self.base_env,
        )
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        self.assertIn("Selected tool: sca", result.stdout)
        self.assertIn("Static analysis args: --config config.json", result.stdout)
        self.assertIn("run static_analysis", result.stdout)
        self.assertIn("FAKE_NPM --prefix", result.stdout)

    def test_python_launcher_headless_listener(self):
        result = run_command(
            ["python", "./cli_launcher.py", "--tool", "listen", "--port", "4567", "--headless"],
            env=self.base_env,
        )
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        self.assertIn("Selected tool: listen", result.stdout)
        self.assertIn("Port override: 4567", result.stdout)
        self.assertIn("Headless: enabled", result.stdout)
        self.assertIn("run start", result.stdout)

    def test_python_launcher_sca_warning_on_headless(self):
        result = run_command(
            ["python", "./cli_launcher.py", "--headless", "--tool", "sca"],
            env=self.base_env,
        )
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        self.assertIn("Selected tool: sca", result.stdout)
        self.assertIn("Static analysis args: (none)", result.stdout)
        self.assertIn("Warning: --port/--headless ignored for sca.", result.stderr)

    def test_java_launcher_sca_args(self):
        if not shutil.which("javac") or not shutil.which("java"):
            self.skipTest("Java toolchain not available")
        compile_result = run_command(["javac", "CliLauncher.java"], env=self.base_env)
        self.assertEqual(compile_result.returncode, 0, msg=compile_result.stderr)
        result = run_command(
            ["java", "CliLauncher", "--tool", "sca", "--config", "config.json"],
            env=self.base_env,
        )
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        self.assertIn("Selected tool: sca", result.stdout)
        self.assertIn("Static analysis args: --config config.json", result.stdout)
        self.assertIn("run static_analysis", result.stdout)

    def test_listen_script_invalid_port(self):
        result = run_command(["./listen.sh", "--port", "nope"], env=self.base_env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Port must be a number.", result.stderr)

    def test_sca_script_no_args(self):
        result = run_command(["./sca.sh"], env=self.base_env)
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        self.assertIn("Static analysis args: (none)", result.stdout)
        self.assertIn("run static_analysis", result.stdout)

    def test_invalid_tool_returns_error(self):
        result = run_command(["./cli_launcher.sh", "--tool", "nope"], env=self.base_env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unknown tool: nope", result.stderr)

    def test_powershell_launcher_listener(self):
        pwsh = shutil.which("pwsh") or shutil.which("powershell")
        if not pwsh:
            self.skipTest("PowerShell not available")
        result = run_command(
            [pwsh, "-File", "./cli_launcher.ps1", "--tool", "listen", "--port", "1234"],
            env=self.base_env,
        )
        self.assertEqual(result.returncode, 0, msg=result.stderr)
        self.assertIn("Selected tool: listen", result.stdout)
        self.assertIn("Port override: 1234", result.stdout)
        self.assertIn("run start", result.stdout)


if __name__ == "__main__":
    unittest.main()
