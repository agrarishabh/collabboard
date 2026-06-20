import nodemailer from 'nodemailer';
import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button } from '@react-email/components';
import { render } from '@react-email/render';

// We will lazily create the transporter to ensure environment variables are loaded
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

// --- React Email Templates ---

interface WorkspaceInvitationEmailProps {
  workspaceName: string;
  inviterName: string;
}

export function WorkspaceInvitationEmail({ workspaceName, inviterName }: WorkspaceInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You have been invited to join {workspaceName}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc', padding: '40px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <Section>
            <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 20px' }}>
              Invitation to {workspaceName}
            </Text>
            <Text style={{ fontSize: '16px', color: '#4b5563', lineHeight: '24px' }}>
              Hi there,
            </Text>
            <Text style={{ fontSize: '16px', color: '#4b5563', lineHeight: '24px' }}>
              <strong>{inviterName}</strong> has invited you to collaborate in their workspace on CollabBoard.
            </Text>
            <Button 
              href={`${process.env.FRONTEND_URL || 'http://localhost:3000'}`}
              style={{ backgroundColor: '#4f46e5', color: '#ffffff', padding: '12px 20px', borderRadius: '6px', textDecoration: 'none', display: 'inline-block', marginTop: '20px', fontWeight: 'bold' }}
            >
              Accept Invitation
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

interface TaskAssignedEmailProps {
  taskTitle: string;
  workspaceName: string;
}

export function TaskAssignedEmail({ taskTitle, workspaceName }: TaskAssignedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New task assigned in {workspaceName}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc', padding: '40px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <Section>
            <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: '0 0 20px' }}>
              New Task Assigned
            </Text>
            <Text style={{ fontSize: '16px', color: '#4b5563', lineHeight: '24px' }}>
              You have been assigned to a new task in <strong>{workspaceName}</strong>.
            </Text>
            <Text style={{ fontSize: '18px', color: '#111827', fontWeight: 'bold', margin: '20px 0', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
              "{taskTitle}"
            </Text>
            <Button 
              href={`${process.env.FRONTEND_URL || 'http://localhost:3000'}`}
              style={{ backgroundColor: '#4f46e5', color: '#ffffff', padding: '12px 20px', borderRadius: '6px', textDecoration: 'none', display: 'inline-block', marginTop: '20px', fontWeight: 'bold' }}
            >
              View Task
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// --- Helper Functions ---

export async function sendWorkspaceInvitationEmail(toEmail: string, workspaceName: string, inviterName: string) {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('⚠️ SMTP credentials missing. Skipping email send.', { toEmail, workspaceName, inviterName });
    return;
  }
  
  try {
    const html = await render(<WorkspaceInvitationEmail workspaceName={workspaceName} inviterName={inviterName} />);
    
    const mailer = getTransporter();
    await mailer.sendMail({
      from: `"CollabBoard" <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: `Invitation to join ${workspaceName}`,
      html: html,
    });
    console.log(`✅ Invitation email sent to ${toEmail}`);
  } catch (error) {
    console.error('❌ Failed to send invitation email:', error);
  }
}

export async function sendTaskAssignedEmail(toEmail: string, taskTitle: string, workspaceName: string) {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('⚠️ SMTP credentials missing. Skipping email send.', { toEmail, taskTitle, workspaceName });
    return;
  }

  try {
    const html = await render(<TaskAssignedEmail taskTitle={taskTitle} workspaceName={workspaceName} />);
    
    const mailer = getTransporter();
    await mailer.sendMail({
      from: `"CollabBoard Tasks" <${process.env.SMTP_EMAIL}>`,
      to: toEmail,
      subject: `New Task Assigned: ${taskTitle}`,
      html: html,
    });
    console.log(`✅ Task assignment email sent to ${toEmail}`);
  } catch (error) {
    console.error('❌ Failed to send task assignment email:', error);
  }
}
