# ascend/backend/app/tests/test_portability.py
import ast
import pathlib

PROVIDER_DIR = pathlib.Path(__file__).parent.parent / "providers"
APP_DIR = pathlib.Path(__file__).parent.parent
FORBIDDEN_PREFIXES = ("google", "vertexai", "google.cloud")


def test_no_cloud_sdk_outside_providers():
    violations = []
    for py_file in APP_DIR.rglob("*.py"):
        # Allow imports inside providers/
        if py_file.is_relative_to(PROVIDER_DIR):
            continue
        tree = ast.parse(py_file.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            names: list[str] = []
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                names = [node.module]
            for name in names:
                if any(name.startswith(p) for p in FORBIDDEN_PREFIXES):
                    violations.append(f"{py_file}:{node.lineno} — {name}")
    assert not violations, (
        "Cloud SDK imports found outside providers/:\n" + "\n".join(violations)
    )
