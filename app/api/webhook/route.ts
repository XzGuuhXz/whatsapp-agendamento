import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    token === verifyToken &&
    challenge
  ) {
    return new NextResponse(challenge, {
      status: 200,
    });
  }

  return NextResponse.json(
    {
      error: "Token de verificação inválido",
    },
    {
      status: 403,
    }
  );
}


export async function POST(request: NextRequest) {
  try {
    await request.json();

    return NextResponse.json(
      {
        received: true,
      },
      {
        status: 200,
      }
    );
  } catch {
    return NextResponse.json(
      {
        error: "Payload inválido",
      },
      {
        status: 400,
      }
    );
  }
}
