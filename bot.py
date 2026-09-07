import os
import logging
import threading
import time
import requests
from flask import Flask
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

# Flask-приложение для ответа на пинги
flask_app = Flask(__name__)

TOKEN = os.environ.get("BOT_TOKEN")

APP_SLOVARNIK = "https://obr-i.github.io/vocab/"
APP_ORFOEPIA = "https://obr-i.github.io/orthoepy_cards/"
APP_O_YO = "https://obr-i.github.io/o_yo_cards/"
APP_EXAM_9 = "https://obr-i.github.io/exam_ru_9/"

logging.basicConfig(level=logging.INFO)

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
    application.add_handler(CallbackQueryHandler(info_callback, pattern="info"))  # исправлено
    application.run_polling()

if __name__ == "__main__":
    main()
