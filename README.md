# LobyStyo - Видеохостинг Платформа

Полнофункциональная видеохостинг платформа, аналогичная YouTube, с адаптивным стримингом, транскодированием видео и реал-тайм обновлениями через WebSocket.

## Технологический стек

### Backend
- **Node.js + Express.js** - серверная часть
- **PostgreSQL** - база данных
- **WebSocket (ws)** - реал-тайм синхронизация
- **bcryptjs** - хеширование паролей
- **jsonwebtoken** - JWT аутентификация
- **multer** - загрузка файлов
- **fluent-ffmpeg + ffmpeg-static** - транскодирование видео в HLS

### Frontend
- **Vanilla JavaScript** - без фреймворков
- **HTML5 Video API + HLS.js** - кастомный видеоплеер
- **History API** - клиентский роутинг
- **CSS3** - стилизация с градиентами и анимациями

### Хостинг
- **Railway** - деплой платформы

## Возможности

### Для пользователей
- Регистрация и аутентификация (JWT в httpOnly cookies)
- Создание и управление каналом
- Загрузка видео (до 10GB)
- Автоматическое транскодирование в HLS (360p, 480p, 720p, 1080p)
- Адаптивный стриминг с переключением качества
- Полнофункциональный видеоплеер с горячими клавишами
- Система лайков/дизлайков
- Комментарии с вложенностью
- Подписки на каналы
- Уведомления в реальном времени
- Поиск по видео и каналам
- Счетчики просмотров

### Технические особенности
- Транскодирование видео в несколько качеств
- WebSocket для мгновенных обновлений
- Полностью адаптивный дизайн
- SPA архитектура без перезагрузки страниц
- Минималистичный градиентный дизайн
- Безопасная аутентификация
- Атомарные операции с базой данных

## Установка и запуск

### Предварительные требования
- Node.js 18+
- PostgreSQL (предоставляется Railway)
- FFmpeg (устанавливается автоматически через ffmpeg-static)

### Локальная разработка

1. **Клонируйте репозиторий**
```bash
git clone <repository-url>
cd lobystyo
```

2. **Установите зависимости**
```bash
npm install
```

3. **Настройте переменные окружения**

Создайте файл `.env`:
```env
DATABASE_URL=postgresql://postgres:hnXHcpFsGEnvsBbamLULzZLqnCLqOOfM@ballast.proxy.rlwy.net:20871/railway
JWT_SECRET=your-secret-key-min-64-characters-long-random-string-here
NODE_ENV=development
PORT=3000
MAX_VIDEO_SIZE_MB=10240
```

4. **Запустите сервер**
```bash
npm start
```

Для разработки с автоперезагрузкой:
```bash
npm run dev
```

5. **Откройте в браузере**
```
http://localhost:3000
```

### Деплой на Railway

1. **Подключите репозиторий к Railway**
   - Создайте новый проект в Railway
   - Подключите GitHub репозиторий
   - Railway автоматически определит Node.js проект

2. **Настройте переменные окружения в Railway**
   - `DATABASE_URL` - автоматически из Railway PostgreSQL
   - `JWT_SECRET` - сгенерируйте случайную строку 64+ символов
   - `NODE_ENV=production`

3. **Деплой**
   - Railway автоматически соберет и запустит приложение
   - Миграции базы данных выполнятся при первом запуске
   - Приложение будет доступно на домене Railway

## Структура базы данных

### Таблицы

**users** - Пользователи и каналы
- id, username (уникальный), display_name, email, password_hash
- avatar_url, banner_url, description
- subscribers_count, videos_count
- created_at, updated_at

**videos** - Видео
- id, user_id, title, description, thumbnail_url
- duration, views_count, likes_count, dislikes_count
- status (processing/ready/failed), visibility (public/unlisted/private)
- qualities (JSONB array), hls_path, file_size
- created_at, updated_at

**subscriptions** - Подписки
- id, subscriber_id, channel_id
- created_at

**comments** - Комментарии
- id, video_id, user_id, parent_id (для вложенности)
- text, likes_count
- created_at, updated_at

**video_likes** - Лайки/дизлайки видео
- id, video_id, user_id, type (like/dislike)
- created_at

**comment_likes** - Лайки комментариев
- id, comment_id, user_id
- created_at

**video_views** - Просмотры видео
- id, video_id, user_id, session_id, ip_address
- watched_seconds, created_at

**notifications** - Уведомления
- id, user_id, from_user_id, video_id
- type, message, is_read
- created_at

## API Эндпоинты

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход
- `GET /api/auth/me` - Текущий пользователь

### Видео
- `GET /api/videos` - Список видео (с пагинацией)
- `GET /api/videos/:videoId` - Данные видео
- `POST /api/videos/upload` - Загрузка видео
- `PATCH /api/videos/:videoId` - Обновление видео
- `DELETE /api/videos/:videoId` - Удаление видео
- `POST /api/videos/:videoId/view` - Записать просмотр
- `GET /api/videos/channel/:username` - Видео канала

### Пользователи
- `GET /api/users/:username` - Профиль пользователя
- `PATCH /api/users/me` - Обновить профиль
- `POST /api/users/me/avatar` - Загрузка аватара
- `POST /api/users/me/banner` - Загрузка баннера
- `POST /api/users/:username/subscribe` - Подписка/отписка
- `GET /api/users/me/notifications` - Уведомления

### Комментарии
- `GET /api/comments/:videoId` - Комментарии к видео
- `POST /api/comments/:videoId` - Добавить комментарий
- `DELETE /api/comments/:commentId` - Удалить комментарий
- `POST /api/comments/:commentId/like` - Лайк комментария

### Лайки
- `POST /api/likes/:videoId` - Лайк/дизлайк видео
- `GET /api/likes/:videoId` - Статус лайков

### Поиск
- `GET /api/search?q=query&type=all` - Поиск видео и каналов

## WebSocket События

### От клиента к серверу
- `auth` - Аутентификация
- `join_video` - Присоединиться к комнате видео
- `leave_video` - Покинуть комнату видео
- `ping` - Проверка соединения

### От сервера к клиенту
- `video:ready` - Видео готово после транскодирования
- `video:views_update` - Обновление просмотров
- `video:likes_update` - Обновление лайков
- `comment:new` - Новый комментарий
- `channel:subscribers_update` - Обновление подписчиков
- `notification:new` - Новое уведомление

## Горячие клавиши видеоплеера

- `Space/K` - Воспроизведение/пауза
- `F` - Полноэкранный режим
- `M` - Вкл/выкл звук
- `←/J` - Перемотка назад (-5/-10 сек)
- `→/L` - Перемотка вперед (+5/+10 сек)
- `↑` - Увеличить громкость
- `↓` - Уменьшить громкость
- `0-9` - Переход к 0-90% видео

## Безопасность

- JWT токены в httpOnly cookies
- bcrypt хеширование паролей (12 rounds)
- Helmet для безопасных заголовков
- Rate limiting на API
- Валидация всех входных данных
- Sanitization HTML в комментариях
- Проверка MIME типов файлов
- Лимиты размера файлов

## Производительность

- gzip сжатие
- Cache-Control заголовки для статики
- Очередь транскодирования (max 2 одновременно)
- Пул соединений PostgreSQL (max 20)
- Оптимизированные индексы БД
- Ленивая загрузка изображений
- Infinite scroll с IntersectionObserver

## Лицензия

MIT

## Автор

LobyStyo Platform - 2024
