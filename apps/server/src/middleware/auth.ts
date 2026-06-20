import { Request, Response, NextFunction } from "express";
import { getToken } from "next-auth/jwt";

// Extend the Express Request type to include our user
export interface AuthRequest extends Request {
  user?: { id: string; email: string; name: string };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error("NEXTAUTH_SECRET is not set in environment variables.");
    }
    // getToken securely decrypts the NextAuth cookie using the SAME secret
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token) {
      res.status(401).json({ error: "Unauthorized. Please log in." });
      return;
    }

    // Attach the user info to the request so our routes can use it!
    req.user = {
      id: token.sub as string, // This is the user's database ID
      email: token.email as string,
      name: token.name as string,
    };

    next(); // Security passed! Move on to the route.
  } catch (error) {
    res.status(401).json({ error: "Invalid token." });
  }
};