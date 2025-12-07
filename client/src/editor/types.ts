export interface RewriteBlockAttrs {
  needsRewrite: boolean;
  originalText: string | null;
  isDeleted: boolean;
  lastEditedBy: string | null;
}

export interface UserInfo {
  name: string;
  color: string;
}

// Generate a random color for user cursor
export function generateUserColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
