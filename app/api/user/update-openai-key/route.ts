import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { openai_api_key } = await req.json()
    const client = await clientPromise
    const db = client.db()

    await db.collection('users').updateOne(
      { email: session.user.email },
      {
        $set: {
          openai_api_key
        }
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update API key" }, { status: 500 })
  }
}
