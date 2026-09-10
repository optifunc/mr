"""Attempt actual installed Safari WebDriver without changing browser permissions."""
import json, subprocess, time, urllib.request, urllib.error
from pathlib import Path
out = Path('docs/evidence/milestone-d/installed-browsers')
out.mkdir(parents=True, exist_ok=True)
server = subprocess.Popen(['/usr/bin/safaridriver', '--port', '5181'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
result = {'browser': 'Installed Safari', 'status': 'not run'}
def request(path, value=None):
    req = urllib.request.Request('http://127.0.0.1:5181' + path, data=json.dumps(value).encode() if value is not None else None, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as response: return json.load(response)
try:
    time.sleep(1)
    session = request('/session', {'capabilities': {'alwaysMatch': {'browserName': 'safari'}}})
    result['session'] = session
    sid = session['value']['sessionId']
    request('/session/' + sid + '/url', {'url': 'http://127.0.0.1:5173/'})
    result['document'] = request('/session/' + sid + '/execute/sync', {'script': 'return {title: document.title, trees: document.querySelectorAll("[role=tree]").length}', 'args': []})
    result['status'] = 'smoke only; full interaction verification outstanding'
    req = urllib.request.Request('http://127.0.0.1:5181/session/' + sid, method='DELETE')
    urllib.request.urlopen(req).close()
except urllib.error.HTTPError as error:
    result['reason'] = error.read().decode()
except Exception as error:
    result['reason'] = str(error)
finally:
    server.terminate()
    result['driverOutput'] = server.communicate(timeout=10)[0].decode()
    (out / 'safari.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
