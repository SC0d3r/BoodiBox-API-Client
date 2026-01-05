# @boodibox/api-client

این بسته برای **ارسال خودکار پست‌ها به `https://boodibox.com/posts`** طراحی شده — یعنی شما می‌توانید به‌سرعت پست منتشر کنید یا یک بات بسازید که محتوای شما را خودکار ارسال کند.  
کتابخانه جریان کامل را پوشش می‌دهد: آپلود تصویر (اختیاری) → نظارت روی وضعیت تا زمانی که پردازش شود → ارسال پست با `medias` که سرور تولید می‌کند.

**آموزش گرفتن API Key:** https://boodibox.com/dev/api-key


## نصب
```bash
npm install @boodibox/api-client
# یا
yarn add @boodibox/api-client
````

> این کتابخانه از امکانات بومی Node (fetch, FormData, Blob) استفاده می‌کند. از Node >= 18 استفاده کنید، یا برای محیط‌هایی که `FormData` / `Blob` ندارند یک polyfill نصب کنید (مثلاً `formdata-node`).

---


این بسته برای خودکارسازی ارسال پست‌ها به آدرس https://boodibox.com/posts ساخته شده است. شما می‌توانید:

* به‌راحتی پست منتشر کنید، یا
* یک ربات بسازید که محتوا را خودکار ارسال کند.

تذکرهای مهم:

* پارامتر `replyPermission` **فقط** دو مقدار معتبر دارد: `PRIVATE` یا `PUBLIC`. (در غیر این صورت کتابخانه خطا پرتاب می‌کند.)
* اگر می‌خواهید یک پست را به عنوان نقل قول ارسال کنید، مقدار `quotePostID` باید یک آی‌دی معتبر **CUID v2** باشد (پترن عملی: حرف اول، سپس حروف و اعداد کوچک، طول معمول 24–32 کاراکتر).

---

## استفادهٔ سریع

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
  replyPermission: 'PUBLIC' // یا 'PRIVATE'
});
```

---

## APIها (توابع اصلی)

* `createClient({ baseUrl, apiKey })` – ساخت کلاینت
* `uploadFiles(files)` – آپلود فایل‌ها (برمی‌گرداند آرایه‌ای از apiupload ids)
* `pollUntilProcessed(uploadId, options)` – نظارت تا وضعیت `PROCESSED`
* `submitPost({ body, medias, replyPermission, quotePostID, userIP })`
* `submitPostWithFiles({ body, files, replyPermission, quotePostID, pollOptions, timeoutMs })`

  * این تابع به‌صورت convenience تمامی مراحل را انجام می‌دهد: آپلود فایل‌ها → poll تا پردازش → ارسال پست با `medias` برگشتی

### شکل فایل‌ها (files)

هر عنصر می‌تواند یکی از موارد باشد:

* `{ path: "./file.jpg" }` — خواندن از دیسک
* `{ buffer: Buffer, filename: "a.jpg" }`
* `{ file: File }` (در مرورگر)

---

## اعتبارسنجی و محدودیت‌ها

* `replyPermission` تنها مقدارهای معتبر `PRIVATE` یا `PUBLIC` را می‌پذیرد.
* `quotePostID` باید شبیه **CUID v2** باشد (حرف اول، سپس حروف/اعداد کوچک؛ طول معمول 24–32). اگر نامعتبر باشد، خطا پرتاب می‌شود.
* کتابخانه تلاش‌هایی برای retry آپلود انجام می‌دهد و اگر سرور خطا بازگرداند، خطا با بدنهٔ پاسخ شامل جزئیات برمی‌گردد (`err.body`).

---

## تست‌ها (Bun)

برای اجرای تست‌های یکپارچه (integration) به صورت اختیاری از متغیرهای محیطی زیر استفاده کنید:

* `API_KEY` — مقدار API key (فرمت: `Bearer <token>` یا فقط توکن)
* `TEST_INTEGRATION=true` — اگر این مقدار تنظیم نشده باشد، تست یکپارچه نادیده گرفته می‌شود
* `BASE_URL` — آدرس سرور (مثلاً `http://localhost:3000` یا `https://boodibox.com`)

نمونه:

```bash
export API_KEY="Bearer xxxxx"
export TEST_INTEGRATION=true
export BASE_URL="http://localhost:3000"
bun test
```

## لینک مفید
* راهنمای گرفتن API Key: [https://boodibox.com/dev/api-key](https://boodibox.com/dev/api-key)

* پست ها بودیباکس: [https://boodibox.com/posts](https://boodibox.com/posts)

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
