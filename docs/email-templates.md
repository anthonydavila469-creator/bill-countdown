# Duezo Email Templates

Three transactional email templates for the Duezo bill reminder app. All templates use a dark theme with orange accent and are mobile-friendly.

---

## Email 1: Welcome Email

**Trigger:** User signs up  
**Subject:** `You're in. Let's never miss a bill again.`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:520px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:28px; font-weight:700; color:#f97316;">Duezo</span>
        </td></tr>

        <!-- Heading -->
        <tr><td style="padding-bottom:16px;">
          <h1 style="margin:0; font-size:24px; font-weight:700; color:#ffffff; line-height:1.3;">
            Welcome aboard 🎉
          </h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding-bottom:24px; color:#d4d4d4; font-size:16px; line-height:1.6;">
          You just made forgetting a bill a whole lot harder. Your <strong style="color:#f97316;">14-day Pro trial</strong> is live — everything's unlocked, no card required.
        </td></tr>

        <!-- Tips -->
        <tr><td style="padding-bottom:28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#141414; border-radius:12px;">
            <tr><td style="padding:20px; color:#d4d4d4; font-size:15px; line-height:1.7;">
              <strong style="color:#ffffff;">Get the most out of your trial:</strong><br><br>
              <span style="color:#f97316;">①</span>&nbsp; <strong style="color:#ffffff;">Connect Gmail</strong> — we'll find your bills automatically<br>
              <span style="color:#f97316;">②</span>&nbsp; <strong style="color:#ffffff;">Add your first bill</strong> — takes about 10 seconds<br>
              <span style="color:#f97316;">③</span>&nbsp; <strong style="color:#ffffff;">Check the widget</strong> — your next due date, always visible
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding-bottom:32px;">
          <a href="{{app_link}}" style="display:inline-block; background-color:#f97316; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:8px;">
            Open Duezo →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid #262626; padding-top:24px; color:#737373; font-size:13px; line-height:1.5;">
          You're getting this because you signed up for Duezo.<br>
          <a href="{{unsubscribe_link}}" style="color:#737373; text-decoration:underline;">Unsubscribe</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## Email 2: Trial Ending Soon

**Trigger:** 3 days before trial expires  
**Subject:** `Your Pro trial ends in 3 days`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:520px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:28px; font-weight:700; color:#f97316;">Duezo</span>
        </td></tr>

        <!-- Heading -->
        <tr><td style="padding-bottom:16px;">
          <h1 style="margin:0; font-size:24px; font-weight:700; color:#ffffff; line-height:1.3;">
            Heads up — 3 days left on Pro
          </h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding-bottom:24px; color:#d4d4d4; font-size:16px; line-height:1.6;">
          Just a friendly nudge. Your free trial wraps up on <strong style="color:#ffffff;">{{trial_end_date}}</strong>. Here's what goes away:
        </td></tr>

        <!-- Feature list -->
        <tr><td style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#141414; border-radius:12px;">
            <tr><td style="padding:20px; color:#d4d4d4; font-size:15px; line-height:1.8;">
              <span style="color:#f97316;">✕</span>&nbsp; Unlimited bills<br>
              <span style="color:#f97316;">✕</span>&nbsp; Auto-sync from Gmail<br>
              <span style="color:#f97316;">✕</span>&nbsp; Push notifications<br>
              <span style="color:#f97316;">✕</span>&nbsp; Calendar view
            </td></tr>
          </table>
        </td></tr>

        <!-- Pricing -->
        <tr><td style="padding-bottom:28px; color:#d4d4d4; font-size:15px; line-height:1.6;">
          Keep everything for <strong style="color:#ffffff;">$4.99/mo</strong> or go yearly at <strong style="color:#f97316;">$39.99/yr</strong> <span style="color:#737373;">(save 33%)</span>.
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding-bottom:32px;">
          <a href="{{upgrade_link}}" style="display:inline-block; background-color:#f97316; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:8px;">
            Upgrade to Pro →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid #262626; padding-top:24px; color:#737373; font-size:13px; line-height:1.5;">
          You're getting this because you have a Duezo account.<br>
          <a href="{{unsubscribe_link}}" style="color:#737373; text-decoration:underline;">Unsubscribe</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## Email 3: Trial Expired

**Trigger:** Trial has ended  
**Subject:** `Your Pro trial ended — but you're not locked out`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:520px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:28px; font-weight:700; color:#f97316;">Duezo</span>
        </td></tr>

        <!-- Heading -->
        <tr><td style="padding-bottom:16px;">
          <h1 style="margin:0; font-size:24px; font-weight:700; color:#ffffff; line-height:1.3;">
            Your trial's over — no stress
          </h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding-bottom:24px; color:#d4d4d4; font-size:16px; line-height:1.6;">
          We get it, life gets busy. Your Pro trial has ended, but Duezo isn't going anywhere.
        </td></tr>

        <!-- Free tier info -->
        <tr><td style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#141414; border-radius:12px;">
            <tr><td style="padding:20px; color:#d4d4d4; font-size:15px; line-height:1.8;">
              <strong style="color:#ffffff;">You still have free access to:</strong><br><br>
              <span style="color:#f97316;">✓</span>&nbsp; Up to 5 bills<br>
              <span style="color:#f97316;">✓</span>&nbsp; 1 daily sync<br>
              <span style="color:#f97316;">✓</span>&nbsp; Due date reminders
            </td></tr>
          </table>
        </td></tr>

        <!-- Nudge -->
        <tr><td style="padding-bottom:28px; color:#d4d4d4; font-size:15px; line-height:1.6;">
          Whenever you're ready, upgrade to unlock unlimited bills, auto-sync, push notifications, and the calendar view. It's all still there waiting.
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding-bottom:32px;">
          <a href="{{upgrade_link}}" style="display:inline-block; background-color:#f97316; color:#ffffff; font-size:16px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:8px;">
            Upgrade to Pro →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid #262626; padding-top:24px; color:#737373; font-size:13px; line-height:1.5;">
          You're getting this because you have a Duezo account.<br>
          <a href="{{unsubscribe_link}}" style="color:#737373; text-decoration:underline;">Unsubscribe</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## Template Variables

| Variable | Description |
|---|---|
| `{{app_link}}` | Deep link to open Duezo |
| `{{upgrade_link}}` | Link to Pro upgrade/paywall screen |
| `{{trial_end_date}}` | Formatted trial expiration date |
| `{{unsubscribe_link}}` | Email preference / unsubscribe URL |
