# web2apk.py — Build APK dari website
import os
import zipfile
import requests
import json

def build_apk(url, name, icon_url=None):
    payload = {
        'url': url,
        'name': name,
        'icon': icon_url or 'https://i.imgur.com/default.png'
    }
    response = requests.post('https://pwa2apk.com/api/generate', data=payload)
    if response.status_code == 200:
        with open(f'{name}.apk', 'wb') as f:
            f.write(response.content)
        print(f'✅ APK siap: {name}.apk')
    else:
        print(f'❌ Gagal: {response.text}')

if __name__ == '__main__':
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 else input('URL website: ')
    name = sys.argv[2] if len(sys.argv) > 2 else input('Nama app: ')
    build_apk(url, name)