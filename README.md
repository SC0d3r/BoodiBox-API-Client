# @boodibox/api-client

<div dir="rtl">

این بسته برای ارسال خودکار **پست‌ها** به https://boodibox.com/posts طراحی شده یعنی شما می‌توانید به‌سرعت پست منتشر کنید یا یک بات بسازید که محتوای شما را خودکار ارسال کند.

کتابخانه جریان کامل را پوشش می‌دهد: آپلود تصویر (اختیاری) ← نظارت روی وضعیت تا زمانی که پردازش شود ← ارسال پست با `medias` که سرور تولید می‌کند.

**آموزش گرفتن API Key:** https://boodibox.com/dev/api-key

## نصب

</div>

```bash
npm install @boodibox/api-client
```
یا
```bash
yarn add @boodibox/api-client
```

<div dir="rtl">

> این کتابخانه از امکانات بومی Node (fetch, FormData, Blob) استفاده می‌کند. از Node >= 18 استفاده کنید، یا برای محیط‌هایی که `FormData` / `Blob` ندارند یک polyfill نصب کنید (مثلاً `formdata-node`).

---


این بسته برای خودکارسازی ارسال پست‌ها به آدرس https://boodibox.com/posts ساخته شده است. شما می‌توانید:

* به‌راحتی پست منتشر کنید، یا
* یک ربات بسازید که محتوا را خودکار ارسال کند.

تذکرهای مهم:

* پارامتر `replyPermission` چهار مقدار معتبر دارد: `PUBLIC` (پیش‌فرض)، `PRIVATE` (هیچ‌کس نمی‌تواند ریپلای کند)، `MENTION` (فقط افراد منشن‌شده)، و `FOLLOW` (افرادی که شما دنبال می‌کنید). (در غیر این صورت کتابخانه خطا پرتاب می‌کند.)
* اگر می‌خواهید یک پست را به عنوان نقل قول ارسال کنید، مقدار `quotePostID` باید یک آی‌دی معتبر **CUID v2** باشد (پترن عملی: حرف اول، سپس حروف و اعداد کوچک، طول معمول 24–32 کاراکتر).

---

## استفادهٔ سریع

</div>

```js
const createClient = require('@boodibox/api-client');

const client = createClient({
  apiKey: 'YOUR_API_KEY_HERE'        // می‌تواند فقط توکن یا "Bearer <token>" باشد
});

// ارسال پست ساده بدون تصویر
await client.submitPost({ body: 'سلام از API' });

// ارسال پست با تصویر (از دیسک)
await client.submitPostWithFiles({
  body: 'پست با عکس',
  files: [{ path: './tiny.jpg' }],
  replyPermission: 'PUBLIC' // یا 'PRIVATE'، 'MENTION'، 'FOLLOW'
});
```

---

<div dir="auto">

## APIها (توابع اصلی)

* `createClient({ baseUrl, apiKey })` – ساخت کلاینت
* `uploadFiles(files)` – آپلود فایل‌ها (برمی‌گرداند آرایه‌ای از upload ids)
* `pollUntilProcessed(uploadId, options)` – نظارت تا وضعیت `PROCESSED`
* `submitPost({ body, medias, replyPermission, quotePostID, userIP })`
* `submitPostWithFiles({ body, files, replyPermission, quotePostID, pollOptions, timeoutMs })`
* `getPost(postId)` – گرفتن اطلاعات یک پست
* `deletePost(postId)` – حذف پست خودتان
* `likePost(postId)` / `unlikePost(postId)` – لایک و آنلایک
* `repostPost(postId)` / `undoRepost(postId)` – ری‌پست و لغو ری‌پست
* `replyToPost(postId, { body, medias })` – ارسال ریپلای
* `getPostContext(postId)` – گرفتن کانتکست کامل پست
* `getPostReplies(postId, { order, maxResults, cursor })` – گرفتن ریپلای‌های مستقیم پست (`top`، `newest`، یا `oldest`)
* `getTimeline({ maxResults, cursor })` – گرفتن تایم‌لاین
* `getMyPosts({ maxResults, cursor })` – گرفتن پست‌های خودتان
* `getUserPosts(idOrUsername, { maxResults, cursor })` – گرفتن پست‌های یک کاربر
* `getMyMentions({ maxResults, cursor })` – گرفتن پست‌هایی که کاربر فعلی را منشن کرده‌اند
* `getUserMentions(idOrUsername, { maxResults, cursor })` – گرفتن پست‌هایی که یک کاربر را منشن کرده‌اند
* `getHashtagPosts({ tag, order, maxResults, cursor })` – گرفتن پست‌های یک هشتگ
* `getUser(idOrUsername)` – گرفتن اطلاعات پروفایل کاربر
* `getFollows(idOrUsername, { type, maxResults, cursor })` – گرفتن followers یا following
* `followUser(idOrUsername)` / `unfollowUser(idOrUsername)` – فالو و آنفالو
* `getBlocks({ maxResults, cursor })` – لیست بلاک‌های کاربر فعلی
* `blockUser(idOrUsername)` / `unblockUser(idOrUsername)` – بلاک و آن‌بلاک
* `getMutes({ maxResults, cursor })` – لیست muteها
* `getNotifications({ maxResults, cursor, date })` – گرفتن نوتیفیکیشن‌های کاربر فعلی

---
  * این تابع به‌صورت convenience تمامی مراحل را انجام می‌دهد: آپلود فایل‌ها ← poll تا پردازش ← ارسال پست با `medias` برگشتی

<!-- <div align="left"> -->

----

### شکل فایل‌ها (files)

هر عنصر می‌تواند یکی از موارد باشد:

<!-- </div> -->

* `{ path: "./file.jpg" }` — خواندن از دیسک
* `{ buffer: Buffer, filename: "a.jpg" }`
* `{ file: File }` (در مرورگر)


---

## APIهای جدید پست‌ها و تعاملات

</div>

```js
// گرفتن یک پست
const post = await client.getPost('post_id');

// لایک / آنلایک
await client.likePost('post_id');
await client.unlikePost('post_id');

// ری‌پست / لغو ری‌پست
await client.repostPost('post_id');
await client.undoRepost('post_id');

// ریپلای
await client.replyToPost('post_id', {
  body: 'پاسخ من',
  medias: []
});

// کانتکست کامل برای ریپلای‌ها، quoteها، و repostها
const context = await client.getPostContext('post_id');

// ریپلای‌های مستقیم پست
const replies = await client.getPostReplies('post_id', {
  order: 'top',
  maxResults: 32,
  cursor: 'next_cursor'
});

// حذف پست خودتان
await client.deletePost('post_id');
```

<div dir="rtl">

---

## تایم‌لاین، پست‌های کاربر، منشن‌ها و هشتگ‌ها

</div>

```js
const timeline = await client.getTimeline({ maxResults: 30 });
const nextCursor = timeline.meta?.next_cursor;

await client.getTimeline({ maxResults: 30, cursor: nextCursor });
await client.getMyPosts({ maxResults: 32 });
await client.getUserPosts('username', { maxResults: 32 });
await client.getMyMentions({ maxResults: 32 });
await client.getUserMentions('username', { maxResults: 32 });
await client.getHashtagPosts({
  tag: 'javascript',
  order: 'date', // date | likes | views | activity
  maxResults: 32
});
```

<div dir="rtl">

* در همه‌ی endpointهای خواندنی، `maxResults` و `cursor` پشتیبانی می‌شود. کلاینت به‌صورت خودکار `maxResults` را به `max_results` تبدیل می‌کند.
* مقدارهای معتبر `order` برای هشتگ‌ها: `date`، `likes`، `views`، `activity`.

---

## کاربران و رابطه‌ها

</div>

```js
const user = await client.getUser('username');

await client.getFollows('username', { type: 'followers' });
await client.getFollows('username', { type: 'following' });

await client.followUser('username');
await client.unfollowUser('username');

await client.getBlocks();
await client.blockUser('username');
await client.unblockUser('username');

await client.getMutes();
```

<div dir="rtl">

---

## نوتیفیکیشن‌ها

</div>

```js
const notifs = await client.getNotifications({
  maxResults: 30,   // به‌صورت limit به سرور فرستاده می‌شود (حداکثر 100)
  cursor: 'MjA',    // از meta.next_cursor پاسخ قبلی
  date: '2026-06-16' // اختیاری: فیلتر روز UTC
});

const nextCursor = notifs.meta?.next_cursor;
```

<div dir="rtl">

---

## خطاها

اگر سرور خطا بدهد، کلاینت یک خطای ساختاریافته پرتاب می‌کند که این فیلدها را دارد:

</div>

```js
try {
  await client.getPost('missing_post');
} catch (err) {
  console.log(err.status); // مثلا 404
  console.log(err.reason); // machine-readable reason
  console.log(err.body);   // بدنه‌ی parse‌شده‌ی پاسخ
}
```

<div dir="rtl">

---

## اعتبارسنجی و محدودیت‌ها

* `replyPermission` تنها مقدارهای معتبر `PUBLIC`، `PRIVATE`، `MENTION` و `FOLLOW` را می‌پذیرد. اگر مقدار ندهید، `PUBLIC` استفاده می‌شود.
* `quotePostID` باید شبیه **CUID v2** باشد (حرف اول، سپس حروف/اعداد کوچک؛ طول معمول 24–32). اگر نامعتبر باشد، خطا پرتاب می‌شود.
* کتابخانه تلاش‌هایی برای retry آپلود انجام می‌دهد و اگر سرور خطا بازگرداند، خطا با بدنهٔ پاسخ شامل جزئیات برمی‌گردد (`err.body`).
* خطاهای API فیلدهای `status`، `reason`، `body`، `url` و `method` دارند.

---

## تست‌ها (Bun)

برای اجرای تست‌های یکپارچه (integration) به صورت اختیاری از متغیرهای محیطی زیر استفاده کنید:

* `API_KEY` :مقدار API key (فرمت: `Bearer <token>` یا فقط توکن)
* `TEST_INTEGRATION=true` :اگر این مقدار تنظیم نشده باشد، تست‌های یکپارچه واقعی نادیده گرفته می‌شوند
* `BASE_URL` :آدرس سرور محلی شما (مثلاً `http://localhost:3000`)
* `TEST_USERNAME` :اختیاری، برای تست خواندن پست‌های کاربر
* `TEST_HASHTAG` :اختیاری، برای تست هشتگ
* `TEST_TARGET_USER` :اختیاری، برای تست فالو/بلاک روی یک کاربر تستی

نمونه:

</div>

```bash
export API_KEY="Bearer xxxxx"
export TEST_INTEGRATION=true
export BASE_URL="http://localhost:3000"
bun test test/e2e*.bun.test.js
```

برای تست‌های mock که به سرور واقعی وصل نمی‌شوند:

```bash
bun test test/mock.bun.test.js
```

<div dir="rtl">

## لینک مفید
* راهنمای گرفتن API Key: [https://boodibox.com/dev/api-key](https://boodibox.com/dev/api-key)

* پست ها بودیباکس: [https://boodibox.com/posts](https://boodibox.com/posts)

</div>

## License

MIT License

Copyright (c) 2026 BoodiBox

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
