import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { env, isDeployed } from '@server/config/env'
import Handlebars from 'handlebars'
import nodemailer from 'nodemailer'

/**
 * Transport and rendering only: Amazon SES when deployed (staging, production), Mailpit everywhere else. Deciding
 * *when* to send belongs to the caller. Callers fire and forget (`.catch(log)`), so a mail
 * outage never fails the request that triggered it.
 */

const ses = isDeployed
  ? new SESv2Client({
      region: env.AWS_REGION,
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
          : undefined,
    })
  : null

const smtp = isDeployed
  ? null
  : nodemailer.createTransport({ host: env.MAILPIT_HOST, port: env.MAILPIT_PORT, secure: false })

// Resolved from this file so it works both from source (server/services) and from the bundle
// (server/dist), which sit at the same depth next to server/templates.
const TEMPLATES_DIR = join(import.meta.dir, '../templates')

Handlebars.registerPartial(
  'layout',
  readFileSync(join(TEMPLATES_DIR, 'partials/layout.hbs'), 'utf-8'),
)

function loadTemplate(name: string) {
  return Handlebars.compile(readFileSync(join(TEMPLATES_DIR, `${name}.hbs`), 'utf-8'))
}

const templates = {
  verifyEmail: loadTemplate('verify-email'),
  resetPassword: loadTemplate('reset-password'),
}

const APP_NAME = 'Qatar Tourism Academy'
const currentYear = String(new Date().getFullYear())

export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&copy;/g, '(c)')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x3D;/g, '=')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const text = stripHtml(html)

  if (smtp) {
    await smtp.sendMail({ from: env.SES_FROM_EMAIL, to, subject, html, text })
    return
  }

  await ses?.send(
    new SendEmailCommand({
      FromEmailAddress: env.SES_FROM_EMAIL,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: html, Charset: 'UTF-8' },
            Text: { Data: text, Charset: 'UTF-8' },
          },
        },
      },
    }),
  )
}

export async function sendVerifyEmail(to: string, data: { name: string; url: string }) {
  const html = templates.verifyEmail({ ...data, appName: APP_NAME, year: currentYear })
  await sendEmail(to, `Verify your email for ${APP_NAME}`, html)
}

export async function sendResetPasswordEmail(to: string, data: { name: string; url: string }) {
  const html = templates.resetPassword({ ...data, appName: APP_NAME, year: currentYear })
  await sendEmail(to, `Reset your ${APP_NAME} password`, html)
}
