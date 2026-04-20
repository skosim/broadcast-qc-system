# Реестр стадионов

Внутренний русскоязычный шаблон на `Next.js 14`, `TypeScript`, `Tailwind CSS`, `Prisma`, `SQLite`, `shadcn/ui`-style компонентах и `Zod` для базового реестра футбольных стадионов.

## Что уже есть

- страницы `/`, `/stadiums/[id]`, `/tags`, `/statistics`, `/upload`, `/jobs`, `/files`
- минимальный desktop-first dashboard layout
- Prisma schema в точности по заданной структуре
- `prisma/seed.ts` с примерами стадионов, замечаний, тегов, файлов, страниц и задач
- локальная загрузка файлов в `storage/uploads`
- простой mock pipeline: после загрузки создаются `SourceFile` и `ProcessingJob`
- модульный typed-слой с fallback на mock-данные, если база еще не инициализирована

## Локальный запуск

1. Установите Node.js 20+.
2. Скопируйте пример окружения:

```bash
cp .env.example .env
```

3. Установите зависимости:

```bash
npm install
```

4. Сгенерируйте Prisma Client:

```bash
npm run db:generate
```

5. Создайте SQLite-базу и примените схему:

```bash
npm run db:push
```

6. Заполните базу тестовыми данными:

```bash
npm run db:seed
```

7. Запустите dev-сервер:

```bash
npm run dev
```

## Структура проекта

- `app/` — страницы, layout и route handler для загрузки
- `components/` — UI-компоненты и составные блоки интерфейса
- `lib/` — Prisma client, репозиторий, утилиты, валидация и mock-данные
- `prisma/` — схема и сиды
- `storage/uploads/` — локально загруженные файлы

## Что можно сделать следующим шагом

- добавить поиск и фильтры по стадионам и замечаниям
- подключить реальные статусы обработки вместо mock-задач
- расширить upload pipeline разбором PDF/DOCX
- добавить аутентификацию и аудит действий, когда понадобится
