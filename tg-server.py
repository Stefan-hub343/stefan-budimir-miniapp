import http.server
import socketserver
import os
import urllib.parse

PORT = 3001

class TelegramHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Критически важные заголовки для Telegram
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Security-Policy', "frame-ancestors https://telegram.org https://*.telegram.org;")
        self.send_header('X-Frame-Options', 'ALLOWALL')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        # Разбираем путь (отбрасываем параметры)
        parsed = urllib.parse.urlparse(self.path)
        file_path = parsed.path
        
        # Если запрос к корню - отдаем index.html
        if file_path == '/' or file_path == '':
            file_path = '/index.html'
        
        # Проверяем существование файла
        full_path = os.path.join(os.getcwd(), file_path.lstrip('/'))
        
        if os.path.exists(full_path) and os.path.isfile(full_path):
            # Файл существует - отдаем его
            self.path = file_path
            return super().do_GET()
        else:
            # Файл не найден - отдаем index.html (для SPA)
            self.path = '/index.html'
            return super().do_GET()
    
    def log_message(self, format, *args):
        # Простое и понятное логирование
        print(f"[{self.log_date_time_string()}] {args[0]} {args[1]} {args[2]} - {args[0]}")

# Запускаем сервер
with socketserver.TCPServer(("", PORT), TelegramHandler) as httpd:
    print("=" * 60)
    print("🚀 TELEGRAM-СОВМЕСТИМЫЙ СЕРВЕР ЗАПУЩЕН")
    print("=" * 60)
    print(f"📌 Порт: {PORT}")
    print(f"📍 Локальный адрес: http://localhost:{PORT}")
    print("\n📁 Доступные файлы:")
    
    # Показываем все HTML и JS файлы
    files = os.listdir('.')
    for file in files:
        if file.endswith(('.html', '.js', '.css')):
            print(f"   ✅ {file}")
    
    print("\n🌐 Ngrok должен быть запущен командой:")
    print(f"   ngrok http {PORT}")
    print("\n🔗 Твой текущий ngrok URL (посмотри в другом окне):")
    print("   https://multihued-likeliest-palma.ngrok-free.dev")
    print("\n📱 В BotFather используй этот URL для кнопки меню")
    print("=" * 60)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 Сервер остановлен")