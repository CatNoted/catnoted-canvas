import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id: boardId } = await params;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Call secure RPC that verifies user access inside the DB
    const { data, error } = await supabase.rpc("get_board_members_with_profiles", {
      target_board_id: boardId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ members: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id: boardId } = await params;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, username, emailOrUsername, role } = body as {
      email?: string;
      username?: string;
      emailOrUsername?: string;
      role?: string;
    };

    const identifier = emailOrUsername || email || username;

    if (!identifier) {
      return NextResponse.json({ error: "Email or username is required" }, { status: 400 });
    }

    if (!role || (role !== "editor" && role !== "viewer")) {
      return NextResponse.json({ error: "Invalid role. Must be 'editor' or 'viewer'" }, { status: 400 });
    }

    // Check if the current user is the owner of the board (only owners can manage members)
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .maybeSingle();

    if (boardError) {
      return NextResponse.json({ error: boardError.message }, { status: 400 });
    }

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (board.created_by !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only board owners can manage members" },
        { status: 403 }
      );
    }

    // Lookup the user ID by email or username using secure RPC
    const { data: targetUserId, error: lookupError } = await supabase.rpc(
      "get_user_id_by_email_or_username",
      { identifier }
    );

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 400 });
    }

    if (!targetUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if the target user is the owner themselves
    if (targetUserId === board.created_by) {
      return NextResponse.json(
        { error: "Cannot add the owner as a collaborator" },
        { status: 400 }
      );
    }

    // Check if the target user is already a collaborator
    const { data: existingMember, error: memberCheckError } = await supabase
      .from("board_members")
      .select("*")
      .eq("board_id", boardId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (memberCheckError) {
      return NextResponse.json({ error: memberCheckError.message }, { status: 400 });
    }

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a collaborator on this board" },
        { status: 400 }
      );
    }

    // Add the user to the board_members table
    const { data: inserted, error: insertError } = await supabase
      .from("board_members")
      .insert({
        board_id: boardId,
        user_id: targetUserId,
        role: role,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ member: inserted }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id: boardId } = await params;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json() as { userId: string };
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if the current user is the owner of the board (only owners can manage members)
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .maybeSingle();

    if (boardError) {
      return NextResponse.json({ error: boardError.message }, { status: 400 });
    }

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (board.created_by !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: Only board owners can manage members" },
        { status: 403 }
      );
    }

    // Delete member
    const { error: deleteError } = await supabase
      .from("board_members")
      .delete()
      .eq("board_id", boardId)
      .eq("user_id", userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
