import { z } from 'zod';
export const LoginDto = z.object({ email: z.string().email(), password: z.string().min(6) });
export const CreateProjectDto = z.object({ developerGroupId: z.string().min(1), name: z.string().min(1) });
export const CreateChatDto = z.object({
  type: z.enum(['group','project']),
  developerGroupId: z.string().min(1),
  projectId: z.string().optional(),
  kbId: z.string().optional()
});
export const MessageDto = z.object({ body: z.string().min(1) });
export const PresignDto = z.object({ fileName: z.string().min(1), contentType: z.string().min(1) });
export const ConfirmUploadDto = z.object({ objectKey: z.string(), mimeType: z.string() });
