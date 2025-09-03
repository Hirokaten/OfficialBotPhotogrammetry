import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';
import path from 'path';
import fs from 'fs';

const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
}

// Use webhook instead of polling for better Replit compatibility
const isProduction = process.env.NODE_ENV === 'production';
const bot = isProduction
  ? new TelegramBot(token)
  : new TelegramBot(token, { polling: true });

// Error handling for bot
bot.on('polling_error', (error) => {
  console.error('Telegram polling error:', error);
});

bot.on('error', (error) => {
  console.error('Telegram bot error:', error);
});

// Setup webhook if in production
if (isProduction && process.env.WEBHOOK_URL) {
  const webhookUrl = `${process.env.WEBHOOK_URL}/webhook/telegram`;
  bot.setWebHook(webhookUrl)
    .then(() => console.log('🚀 Webhook set to:', webhookUrl))
    .catch(err => console.error('Webhook setup failed:', err));
} else {
  console.log('🚀 Bot started with polling enabled');
}

// File storage directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Store last message IDs for editing to prevent message accumulation
const userLastMessages: Map<number, number> = new Map();

// Bot commands
const COMMANDS = {
  START: '/start',
  HELP: '/help',
  LECTURES: '/lectures',
  SUBJECTS: '/subjects',
  ADMIN: '/admin',
  MAKE_ADMIN: '/makeadmin',
};

// Handle message updates to prevent accumulation
let processedUpdates = new Set();

// Start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const username = msg.from?.username;
  const firstName = msg.from?.first_name;
  const lastName = msg.from?.last_name;

  if (!telegramId) return;

  try {
    let user = await storage.getUserByTelegramId(telegramId);

    if (!user) {
      user = await storage.createUser({
        telegramId,
        username: username || '',
        firstName: firstName || '',
        lastName: lastName || '',
        isAdmin: false,
      });
    }

    await showMainMenu(chatId, telegramId);
  } catch (error) {
    console.error('Error in start command:', error);
    await bot.sendMessage(chatId, 'Виникла помилка. Спробуйте ще раз.');
  }
});

// Help command
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) return;

  try {
    const user = await storage.getUserByTelegramId(telegramId);

    // Get deployment URL for web panel
    const deploymentUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : process.env.WEB_PANEL_URL || process.env.REPL_URL;

    const webPanelUrl = deploymentUrl?.startsWith('https://') ? deploymentUrl : null;

    const helpText = webPanelUrl
      ? `❓ **Довідка PhotogrammetryBot**\n\n📚 **Доступні команди:**\n• /start - Почати роботу з ботом\n• /lectures - Переглянути всі лекції\n• /help - Ця довідка\n• /admin - Статистика (тільки для адмінів)\n\n🔧 **Як користуватись:**\n• Студенти можуть переглядати та завантажувати матеріали\n• Адміни можуть завантажувати файли через бот або веб-панель\n• Підтримуються PDF та зображення (до 20МБ)\n\n🌐 **Веб-панель:** ${webPanelUrl}`
      : `❓ **Довідка PhotogrammetryBot**\n\n📚 **Доступні команди:**\n• /start - Почати роботу з ботом\n• /lectures - Переглянути всі лекції\n• /help - Ця довідка\n• /admin - Статистика (тільки для адмінів)\n\n🔧 **Як користуватись:**\n• Студенти можуть переглядати та завантажувати матеріали\n• Адміни можуть завантажувати файли через бот або веб-панель\n• Підтримуються PDF та зображення (до 20МБ)\n\n🌐 **Веб-панель буде доступна після deployment**`;

    const keyboard = user?.isAdmin
      ? [
          [{ text: '📚 Переглянути лекції', callback_data: 'view_lectures' }],
          [{ text: '📊 Статистика', callback_data: 'admin_stats' }],
          ...(webPanelUrl ? [[{ text: '🌐 Веб-панель', url: webPanelUrl }]] : [])
        ]
      : [
          [{ text: '📚 Переглянути лекції', callback_data: 'view_lectures' }],
          [{ text: '📊 Статистика', callback_data: 'view_stats' }]
        ];

    await bot.sendMessage(chatId, helpMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('Error in help command:', error);
    await bot.sendMessage(chatId, 'Виникла помилка. Спробуйте ще раз.');
  }
});

// Lectures command
bot.onText(/\/lectures/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) return;

  await showLecturesList(chatId, telegramId);
});

// Admin command
bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) return;

  try {
    const user = await storage.getUserByTelegramId(telegramId);

    if (!user?.isAdmin) {
      await bot.sendMessage(chatId, '❌ У вас немає прав адміністратора.');
      return;
    }

    const stats = await storage.getStats();
    const storageGB = (stats.storageUsed / (1024 * 1024 * 1024)).toFixed(2);

    const deploymentUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : process.env.WEB_PANEL_URL || process.env.REPL_URL;

    const webPanelUrl = deploymentUrl?.startsWith('https://') ? deploymentUrl : null;

    const adminMessage = `📊 **Статистика бота:**\n\n📚 Всього лекцій: ${stats.totalLectures}\n👥 Активних студентів: ${stats.activeStudents}\n⬇️ Завантажень: ${stats.totalDownloads}\n💾 Використано пам'яті: ${storageGB} ГБ\n\n🌐 **Web панель:** ${webPanelUrl}`;

    await bot.sendMessage(chatId, adminMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in admin command:', error);
    await bot.sendMessage(chatId, 'Виникла помилка при отриманні статистики.');
  }
});

// Make admin command
bot.onText(/\/makeadmin (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const targetUsername = match?.[1];

  if (!telegramId || !targetUsername) return;

  try {
    const admin = await storage.getUserByTelegramId(telegramId);

    if (!admin?.isAdmin) {
      await bot.sendMessage(chatId, '❌ У вас немає прав адміністратора.');
      return;
    }

    await bot.sendMessage(chatId, `⚠️ Для надання прав адміністратора користувачеві ${targetUsername}, потрібно щоб він спочатку написав боту /start, а потім зв'яжіться з розробником.`);
  } catch (error) {
    console.error('Error in makeadmin command:', error);
    await bot.sendMessage(chatId, 'Виникла помилка.');
  }
});

// Clean orphaned lectures command (admin only)
bot.onText(/\/cleanup/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) return;

  try {
    const user = await storage.getUserByTelegramId(telegramId);

    if (!user?.isAdmin) {
      await bot.sendMessage(chatId, '❌ У вас немає прав адміністратора.');
      return;
    }

    await bot.sendMessage(chatId, '🧹 Перевіряю файли та очищую пошкоджені записи...');

    const lectures = await storage.getLectures(1000); // Get all lectures
    let removedCount = 0;

    for (const lecture of lectures) {
      const filePath = path.resolve(lecture.filePath);
      if (!fs.existsSync(filePath)) {
        console.log('🗑️ Removing orphaned lecture:', lecture.title);
        await storage.deleteLecture(lecture.id);
        removedCount++;
      }
    }

    await bot.sendMessage(chatId, `✅ Очищення завершено!\n\n🗑️ Видалено пошкоджених записів: ${removedCount}\n📚 Залишилось лекцій: ${lectures.length - removedCount}`);
  } catch (error) {
    console.error('Error in cleanup command:', error);
    await bot.sendMessage(chatId, 'Виникла помилка при очищенні.');
  }
});

// Handle callback queries (inline buttons)
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message?.chat.id;
  const data = callbackQuery.data;
  const telegramId = callbackQuery.from.id.toString();

  if (!chatId || !data) return;

  console.log('🔘 Callback query:', { chatId, data, telegramId });

  try {
    const user = await storage.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.answerCallbackQuery(callbackQuery.id, { text: 'Спочатку напишіть /start' });
      return;
    }

    await bot.answerCallbackQuery(callbackQuery.id);

    if (data.startsWith('download_')) {
      const lectureId = data.replace('download_', '');
      const lecture = await storage.getLectureById(lectureId);

      if (!lecture) {
        await bot.sendMessage(chatId, '❌ Лекцію не знайдено');
        return;
      }

      // Check if file exists
      const filePath = path.resolve(lecture.filePath);
      console.log('🔍 Checking file:', { lectureId, filePath, exists: fs.existsSync(filePath) });

      if (!fs.existsSync(filePath)) {
        await bot.sendMessage(chatId, `❌ Файл "${lecture.fileName}" не знайдено на сервері.\n\nМожливо файл було видалено або пошкоджено.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📚 Повернутись до списку', callback_data: 'view_lectures' }],
              ...(user.isAdmin ? [[{ text: '🗑️ Видалити лекцію', callback_data: `delete_${lectureId}` }]] : [])
            ]
          }
        });
        return;
      }

      // Record download
      await storage.recordDownload({
        userId: user.id,
        lectureId: lecture.id,
      });

      try {
        const keyboard = user.isAdmin
          ? [
              [{ text: '📚 Всі лекції', callback_data: 'view_lectures' }],
              [{ text: '🗑️ Видалити лекцію', callback_data: `delete_${lectureId}` }]
            ]
          : [
              [{ text: '📚 Всі лекції', callback_data: 'view_lectures' }]
            ];

        await bot.sendDocument(chatId, filePath, {
          caption: `📄 ${lecture.title}\n${lecture.description || ''}\n\n📖 Предмет: ${lecture.subject}\n💾 Розмір: ${formatFileSize(lecture.fileSize)}`,
          reply_markup: {
            inline_keyboard: keyboard
          }
        });

        console.log('✅ File sent successfully:', lecture.fileName);
      } catch (error) {
        console.error('❌ Error sending file:', error);
        await bot.sendMessage(chatId, '❌ Виникла помилка при відправці файлу. Спробуйте ще раз.');
      }
    } else if (data === 'main_menu') {
      await showMainMenu(chatId, telegramId);
    } else if (data === 'view_lectures') {
      await showLecturesList(chatId, telegramId);
    } else if (data.startsWith('subject_')) {
      const subject = data.replace('subject_', '');
      const lectures = await storage.getLecturesBySubject(subject);

      if (lectures.length === 0) {
        await bot.sendMessage(chatId, '📭 Лекції з цього предмету відсутні.');
        return;
      }

      const keyboard = {
        inline_keyboard: [
          ...lectures.map(lecture => [{
            text: `📄 ${lecture.title}`,
            callback_data: `download_${lecture.id}`
          }]),
          [{ text: '◀️ Назад', callback_data: 'main_menu' }]
        ]
      };

      await bot.sendMessage(chatId, `📚 **Лекції з предмету "${subject}":**`, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else if (data === 'help') {
      const deploymentUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : process.env.WEB_PANEL_URL || process.env.REPL_URL;

      const hasValidUrl = deploymentUrl && deploymentUrl.startsWith('https://');

      const helpText = hasValidUrl
        ? `❓ **Довідка PhotogrammetryBot**\n\n📚 **Доступні команди:**\n• /start - Почати роботу з ботом\n• /lectures - Переглянути всі лекції\n• /help - Ця довідка\n• /admin - Статистика (тільки для адмінів)\n\n🔧 **Як користуватись:**\n• Студенти можуть переглядати та завантажувати матеріали\n• Адміни можуть завантажувати файли через бот або веб-панель\n• Підтримуються PDF та зображення (до 20МБ)\n\n🌐 **Веб-панель:** ${hasValidUrl}`
        : `❓ **Довідка PhotogrammetryBot**\n\n📚 **Доступні команди:**\n• /start - Почати роботу з ботом\n• /lectures - Переглянути всі лекції\n• /help - Ця довідка\n• /admin - Статистика (тільки для адмінів)\n\n🔧 **Як користуватись:**\n• Студенти можуть переглядати та завантажувати матеріали\n• Адміни можуть завантажувати файли через бот або веб-панель\n• Підтримуються PDF та зображення (до 20МБ)\n\n🌐 **Веб-панель буде доступна після deployment**`;

      await bot.sendMessage(chatId, helpText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📚 Переглянути лекції', callback_data: 'view_lectures' }]
          ]
        }
      });
    } else if (data === 'admin_stats') {
      const stats = await storage.getStats();
      const storageGB = (stats.storageUsed / (1024 * 1024 * 1024)).toFixed(2);

      const deploymentUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : process.env.WEB_PANEL_URL || process.env.REPL_URL;

      const hasValidUrl = deploymentUrl && deploymentUrl.startsWith('https://');

      const adminMessage = hasValidUrl
        ? `📊 Детальна статистика бота:\n\n📚 Всього лекцій: ${stats.totalLectures}\n👥 Активних студентів: ${stats.activeStudents}\n⬇️ Завантажень: ${stats.totalDownloads}\n💾 Використано пам'яті: ${storageGB} ГБ\n\n🌐 Web панель: ${hasValidUrl}`
        : `📊 Детальна статистика бота:\n\n📚 Всього лекцій: ${stats.totalLectures}\n👥 Активних студентів: ${stats.activeStudents}\n⬇️ Завантажень: ${stats.totalDownloads}\n💾 Використано пам'яті: ${storageGB} ГБ\n\n🌐 Web панель буде доступна після deployment`;

      const keyboard = hasValidUrl
        ? [[{ text: '🌐 Відкрити веб-панель', url: hasValidUrl }]]
        : [];

      await bot.sendMessage(chatId, adminMessage, {
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } else if (data === 'view_stats') {
      const stats = await storage.getStats();
      const storageGB = (stats.storageUsed / (1024 * 1024 * 1024)).toFixed(2);

      const statsMessage = `📊 Статистика PhotogrammetryBot:\n\n📚 Всього лекцій: ${stats.totalLectures}\n👥 Студентів: ${stats.activeStudents}\n⬇️ Завантажень: ${stats.totalDownloads}\n💾 Використано пам'яті: ${storageGB} ГБ`;

      await bot.sendMessage(chatId, statsMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📚 Переглянути лекції', callback_data: 'view_lectures' }]
          ]
        }
      });
    } else if (data.startsWith('delete_')) {
      const lectureId = data.replace('delete_', '');
      try {
        // Get lecture info BEFORE deleting
        const lecture = await storage.getLectureById(lectureId);
        if (!lecture) {
          await bot.sendMessage(chatId, '❌ Лекцію не знайдено');
          return;
        }

        // Delete file from disk first
        if (fs.existsSync(lecture.filePath)) {
          fs.unlinkSync(lecture.filePath);
        }

        // Then delete from database
        await storage.deleteLecture(lectureId);

        await bot.sendMessage(chatId, '✅ Лекцію успішно видалено.');
        await showLecturesList(chatId, telegramId); // Refresh the list
      } catch (error) {
        console.error('Error deleting lecture:', error);
        await bot.sendMessage(chatId, '❌ Виникла помилка при видаленні лекції.');
      }
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    await bot.answerCallbackQuery(callbackQuery.id, { text: 'Виникла помилка' });
  }
});

// Handle text messages (non-commands)
bot.on('message', async (msg) => {
  // Skip commands - they are handled by onText handlers
  if (msg.text?.startsWith('/')) return;

  // Skip non-text messages
  if (!msg.text) return;

  // Skip if already processed
  if (processedUpdates.has(msg.message_id)) return;
  processedUpdates.add(msg.message_id);

  // Clean old processed IDs to prevent memory leaks
  if (processedUpdates.size > 1000) {
    const oldIds = Array.from(processedUpdates).slice(0, 500);
    oldIds.forEach(id => processedUpdates.delete(id));
  }

  console.log('📨 Received text message:', {
    chatId: msg.chat.id,
    from: msg.from?.first_name,
    username: msg.from?.username,
    text: msg.text,
    messageId: msg.message_id
  });

  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();
  const text = msg.text;

  if (!telegramId) return;

  try {
    const user = await storage.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.sendMessage(chatId, 'Спочатку напишіть /start');
      return;
    }

    switch (text) {
      case '📚 Лекції':
        await showLecturesList(chatId, telegramId);
        break;
      case '📊 Статистика':
        // Show stats for all users
        const stats = await storage.getStats();
        const storageGB = (stats.storageUsed / (1024 * 1024 * 1024)).toFixed(2);

        const statsMessage = `📊 Статистика PhotogrammetryBot:\n\n📚 Всього лекцій: ${stats.totalLectures}\n👥 Студентів: ${stats.activeStudents}\n⬇️ Завантажень: ${stats.totalDownloads}\n💾 Використано пам'яті: ${storageGB} ГБ`;

        await bot.sendMessage(chatId, statsMessage, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📚 Переглянути лекції', callback_data: 'view_lectures' }]
            ]
          }
        });
        break;
      case '👨‍💼 Адмін панель':
        if (user.isAdmin) {
          const deploymentUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
            : process.env.WEB_PANEL_URL || process.env.REPL_URL;

          const hasValidUrl = deploymentUrl && deploymentUrl.startsWith('https://');

          const adminMessage = hasValidUrl
            ? `👨‍💼 Адмін панель\n\n🌐 Веб-панель: ${hasValidUrl}\n\nТакож можете використовувати команду /admin для детальної статистики`
            : `👨‍💼 Адмін панель\n\n🌐 Веб-панель буде доступна після deployment на Replit\n\nВикористовуйте команду /admin для детальної статистики`;

          const keyboard = hasValidUrl
            ? [
                [{ text: '🌐 Відкрити веб-панель', url: hasValidUrl }],
                [{ text: '📊 Детальна статистика', callback_data: 'admin_stats' }]
              ]
            : [
                [{ text: '📊 Детальна статистика', callback_data: 'admin_stats' }]
              ];

          await bot.sendMessage(chatId, adminMessage, {
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } else {
          await bot.sendMessage(chatId, '❌ У вас немає прав адміністратора.');
        }
        break;
      case '❓ Допомога':
        const helpWebPanelUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : process.env.WEB_PANEL_URL || process.env.REPL_URL;
        const hasHelpValidUrl = helpWebPanelUrl && helpWebPanelUrl.startsWith('https://');

        const helpText = hasHelpValidUrl
          ? `❓ Довідка PhotogrammetryBot\n\n📚 Доступні команди:\n• /start - Почати роботу\n• /lectures - Переглянути лекції\n• /help - Довідка\n• /admin - Статистика (для адмінів)\n\n🔧 Як користуватись:\n• Студенти можуть переглядати та завантажувати матеріали\n• Адміни можуть завантажувати файли через бот або веб-панель\n• Підтримуються PDF та зображення (до 20МБ)\n\n🌐 Веб-панель: ${hasHelpValidUrl}`
          : `❓ Довідка PhotogrammetryBot\n\n📚 Доступні команди:\n• /start - Почати роботу\n• /lectures - Переглянути лекції\n• /help - Довідка\n• /admin - Статистика (для адмінів)\n\n🔧 Як користуватись:\n• Студенти можуть переглядати та завантажувати матеріали\n• Адміни можуть завантажувати файли через бот або веб-панель\n• Підтримуються PDF та зображення (до 20МБ)\n\n🌐 Веб-панель буде доступна після deployment`;

        await bot.sendMessage(chatId, helpText, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📚 Переглянути лекції', callback_data: 'view_lectures' }]
            ]
          }
        });
        break;
      case '📖 Фотограмметрія':
        // Handle old button that might still be in some keyboards
        await showLecturesList(chatId, telegramId);
        break;
      default:
        // If admin sends file caption or other text, try to extract title
        if (user.isAdmin) {
          await bot.sendMessage(chatId, '💡 Для завантаження файлу просто надішліть PDF або зображення з підписом - назвою лекції.');
        } else {
          await bot.sendMessage(chatId, '❌ Не розумію цю команду. Використайте /help для перегляду доступних команд.');
        }
        break;
    }
  } catch (error) {
    console.error('Error handling text message:', error);
    await bot.sendMessage(chatId, 'Виникла помилка. Спробуйте ще раз.');
  }
});

// Handle file uploads from admins
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) return;

  try {
    const user = await storage.getUserByTelegramId(telegramId);

    if (!user?.isAdmin) {
      await bot.sendMessage(chatId, '❌ Тільки адміністратори можуть завантажувати файли.');
      return;
    }

    const document = msg.document;
    if (!document) return;

    // Check file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const isValidType = allowedTypes.includes(document.mime_type || '') ||
                       /\.(pdf|jpg|jpeg|png)$/i.test(document.file_name || '');

    if (!isValidType) {
      await bot.sendMessage(chatId, '❌ Підтримуються тільки PDF файли та зображення (JPG, PNG).');
      return;
    }

    // Check file size (max 20MB)
    if ((document.file_size || 0) > 20 * 1024 * 1024) {
      await bot.sendMessage(chatId, '❌ Розмір файлу не перевищувати 20 МБ.');
      return;
    }

    await bot.sendMessage(chatId, '⏳ Завантажую файл...');

    // Download file
    const fileInfo = await bot.getFile(document.file_id);
    const fileName = document.file_name || `lecture_${Date.now()}.pdf`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    // Download file to specific path
    const fileStream = await bot.getFileStream(document.file_id);
    const writeStream = fs.createWriteStream(filePath);
    fileStream.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Determine file type and subject from caption or filename
    const caption = msg.caption || '';
    const fileType = document.mime_type?.includes('pdf') ? 'pdf' : 'image';

    // Try to extract subject and title from caption or use defaults
    const title = caption || fileName.replace(/\.[^/.]+$/, '');
    const subject = 'photogrammetry'; // Always photogrammetry

    // Save to database
    const lecture = await storage.createLecture({
      title,
      description: caption,
      subject,
      fileName,
      filePath,
      fileType,
      fileSize: document.file_size || 0,
      uploadedBy: user.id,
    });

    await bot.sendMessage(chatId, `✅ Лекцію "${title}" успішно завантажено!\n\n📖 Предмет: ${subject}\n📄 Файл: ${fileName}\n💾 Розмір: ${formatFileSize(document.file_size || 0)}`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📚 Переглянути всі лекції', callback_data: 'view_lectures' }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Error handling document upload:', error);
    await bot.sendMessage(chatId, '❌ Виникла помилка при завантаженні файлу.');
  }
});

// Handle photo uploads
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString();

  if (!telegramId) return;

  try {
    const user = await storage.getUserByTelegramId(telegramId);

    if (!user?.isAdmin) {
      await bot.sendMessage(chatId, '❌ Тільки адміністратори можуть завантажувати файли.');
      return;
    }

    const photo = msg.photo?.[msg.photo.length - 1]; // Get highest resolution
    if (!photo) return;

    await bot.sendMessage(chatId, '⏳ Завантажую зображення...');

    // Download photo
    const fileInfo = await bot.getFile(photo.file_id);
    const fileName = `image_${Date.now()}.jpg`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    // Download photo to specific path
    const fileStream = await bot.getFileStream(photo.file_id);
    const writeStream = fs.createWriteStream(filePath);
    fileStream.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const caption = msg.caption || '';
    const title = caption || `Зображення ${new Date().toLocaleDateString('uk-UA')}`;
    const subject = 'photogrammetry'; // Always photogrammetry

    const lecture = await storage.createLecture({
      title,
      description: caption,
      subject,
      fileName,
      filePath,
      fileType: 'image',
      fileSize: photo.file_size || 0,
      uploadedBy: user.id,
    });

    await bot.sendMessage(chatId, `✅ Зображення "${title}" успішно завантажено!\n\n📖 Предмет: ${subject}\n📷 Файл: ${fileName}`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📚 Переглянути всі лекції', callback_data: 'view_lectures' }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Error handling photo upload:', error);
    await bot.sendMessage(chatId, '❌ Виникла помилка при завантаженні зображення.');
  }
});

// Helper functions for menu navigation
async function showMainMenu(chatId: number, telegramId: string) {
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) return;

    const isAdmin = user.isAdmin;

    const menuMessage = `👋 Вітаємо в PhotogrammetryBot!\n\n📚 Тут ви можете знайти матеріали з фотограмметрії\n\n${isAdmin ? '👨‍💼 Ви адміністратор - можете завантажувати файли\n\n' : ''}Оберіть дію:`;

    // Permanent keyboard buttons at bottom
    const replyKeyboard = {
      keyboard: [
        [{ text: '📚 Лекції' }, { text: '📊 Статистика' }],
        [{ text: '❓ Допомога' }],
        ...(isAdmin ? [[{ text: '👨‍💼 Адмін панель' }]] : [])
      ],
      resize_keyboard: true,
      persistent: true
    };

    await bot.sendMessage(chatId, menuMessage, {
      reply_markup: replyKeyboard
    });
  } catch (error) {
    console.error('Error in showMainMenu:', error);
    await bot.sendMessage(chatId, 'Виникла помилка. Спробуйте ще раз.');
  }
}

async function showLecturesList(chatId: number, telegramId: string) {
  try {
    const lectures = await storage.getLectures(50); // Show latest 50

    const messageText = lectures.length === 0
      ? '📚 Лекції поки що відсутні.\n\nАдміністратори можуть додати їх через веб-панель або надіславши файли боту.'
      : `📚 Доступні лекції з фотограмметрії:\n\nВсього: ${lectures.length}`;

    const keyboard = {
      inline_keyboard: [
        ...lectures.map(lecture => [{
          text: `📄 ${lecture.title}`,
          callback_data: `download_${lecture.id}`
        }])
      ]
    };

    await bot.sendMessage(chatId, messageText, {
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Error in showLecturesList:', error);
    await bot.sendMessage(chatId, 'Виникла помилка при завантаженні лекцій.');
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export { bot };