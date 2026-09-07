import os
import logging
import threading
import time
import requests
from flask import Flask, request, jsonify, send_file
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import json
import csv
from datetime import datetime

# Flask-приложение для ответа на пинги
flask_app = Flask(__name__)

TOKEN = os.environ.get("BOT_TOKEN")

APP_SLOVARNIK = "https://obr-i.github.io/vocab/"
APP_ORFOEPIA = "https://obr-i.github.io/orthoepy_cards/"
APP_O_YO = "https://obr-i.github.io/o_yo_cards/"
APP_EXAM_9 = "https://obr-i.github.io/exam_ru_9/"

logging.basicConfig(level=logging.INFO)

########


# Путь к файлу статистики
STATS_FILE = 'stats.csv'

# Создаём файл с заголовками, если его нет
if not os.path.exists(STATS_FILE):
    with open(STATS_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            'session_id', 'timestamp', 'total', 'know', 'dontKnow', 'percent', 'errors'
        ])

@flask_app.route('/api/stats', methods=['POST', 'OPTIONS'])
def receive_stats():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data'}), 400

    required = ['session_id', 'timestamp', 'total', 'know', 'dontKnow', 'percent']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing fields'}), 400

    with open(STATS_FILE, 'a', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            data['session_id'],
            data['timestamp'],
            data['total'],
            data['know'],
            data['dontKnow'],
            data['percent'],
            '; '.join(data.get('errors', []))
        ])

    response = jsonify({'status': 'ok'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200


#######

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("📚 №9 ЕГЭ по русскому языку", web_app=WebAppInfo(url=APP_EXAM_9))],
        [InlineKeyboardButton("🔊 №4 ЕГЭ по русскому языку. Орфоэпия)", web_app=WebAppInfo(url=APP_ORFOEPIA))],
        [InlineKeyboardButton("📙 Словарные слова", web_app=WebAppInfo(url=APP_SLOVARNIK))],
        [InlineKeyboardButton("📗 О/Ё после шипящих", web_app=WebAppInfo(url=APP_O_YO))],
        [InlineKeyboardButton("ℹ️ Информация", callback_data="info")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("Привет! Выбери тренажёр:", reply_markup=reply_markup)

async def info_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await context.bot.send_message(
        chat_id=query.message.chat_id,
        text="Это бот для подготовки к ЕГЭ 2027 по русскому языку.\n *В разработке*"
    )

@flask_app.route('/')
def index():
    return "Бот работает!", 200

@flask_app.route('/ping')
def ping():
    return "pong", 200

def self_pinger():
    host = os.environ.get("RENDER_EXTERNAL_URL", "http://localhost:5000")
    ping_url = f"{host}/ping"
    while True:
        try:
            requests.get(ping_url, timeout=5)
            logging.info(f"Self-ping успешен: {ping_url}")
        except Exception as e:
            logging.warning(f"Self-ping не удался: {e}")
        time.sleep(840)

@flask_app.route('/download_stats')
def download_stats():
    if not os.path.exists(STATS_FILE):
        return "Файл статистики пока не создан.", 404
    return send_file(
        STATS_FILE,
        as_attachment=True,
        download_name=f'stats_{datetime.now().strftime("%Y%m%d")}.csv',
        mimetype='text/csv'
    )

async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not os.path.exists(STATS_FILE):
        await update.message.reply_text("Статистики пока нет.")
        return

    # Читаем CSV
    rows = []
    with open(STATS_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        await update.message.reply_text("Нет записей.")
        return

    total_sessions = len(rows)
    total_words = sum(int(r['total']) for r in rows)
    total_know = sum(int(r['know']) for r in rows)
    avg_percent = sum(int(r['percent']) for r in rows) / total_sessions if total_sessions else 0

    # Топ-5 ошибок
    error_counts = {}
    for r in rows:
        errors = r.get('errors', '').split('; ')
        for e in errors:
            if e:
                error_counts[e] = error_counts.get(e, 0) + 1
    top_errors = sorted(error_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_errors_text = '\n'.join([f"• {word} — {count} раз" for word, count in top_errors]) if top_errors else "Нет ошибок"

    message = (
        f"📊 **Общая статистика**\n"
        f"Сессий: {total_sessions}\n"
        f"Всего слов: {total_words}\n"
        f"Правильных ответов: {total_know}\n"
        f"Средняя успеваемость: {avg_percent:.1f}%\n\n"
        f"**Частые ошибки:**\n{top_errors_text}"
    )
    await update.message.reply_text(message, parse_mode='Markdown')



def main():
    pinger_thread = threading.Thread(target=self_pinger, daemon=True)
    pinger_thread.start()

    flask_thread = threading.Thread(
        target=flask_app.run,
        kwargs={'host': '0.0.0.0', 'port': int(os.environ.get('PORT', 5000)), 'debug': False},
        daemon=True
    )
    flask_thread.start()

    application = Application.builder().token(TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(info_callback, pattern="info"))
    application.add_handler(CommandHandler("stats", stats_command))   # <<< перенесите сюда
    application.run_polling()

if __name__ == "__main__":
    main()

