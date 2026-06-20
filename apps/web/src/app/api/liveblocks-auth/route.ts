import { Liveblocks } from "@liveblocks/node";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST() {
  // Check if we have a secret key configured
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    return new Response("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  // Get the current user from NextAuth session
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const liveblocks = new Liveblocks({
    secret: secret,
  });

  // Assign a random cream/beige color based on their user ID to stay consistent
  const colors = ["#fdfcdc", "#e5e4c6", "#d1d0b2", "#bcbc9e", "#f5f4d8", "#dfdebc"];
  const colorIndex = session.user.id.charCodeAt(0) % colors.length;
  const userColor = colors[colorIndex];

  // Create a session for the current user
  // This is what allows the cursor to display the correct name!
  const liveblocksSession = liveblocks.prepareSession(
    session.user.id,
    {
      userInfo: {
        name: session.user.name || "Anonymous",
        color: userColor,
        picture: session.user.image || "",
      },
    }
  );

  // We are currently allowing access to any room by default, but you could restrict this
  // by parsing the room ID from the request and checking DB permissions.
  liveblocksSession.allow(`*`, liveblocksSession.FULL_ACCESS);

  const { status, body } = await liveblocksSession.authorize();
  return new Response(body, { status });
}
