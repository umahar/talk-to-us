"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ALLOWED_FILE_TYPES,
  commentSchema,
  FILE_COUNT_LIMIT,
  FILE_LIMIT,
  getFileError,
  ideaFormSchema,
  isAdmin,
  type Category,
  type Idea,
  type IdeaAttachment,
  type IdeaComment,
  type IdeaEvent,
  type Profile,
  type UserRole,
} from "@/lib/domain";
import {
  DEMO_ATTACHMENTS,
  DEMO_CATEGORIES,
  DEMO_COMMENTS,
  DEMO_EVENTS,
  DEMO_IDEAS,
  DEMO_PROFILES,
} from "@/lib/demo-data";
import { getSupabaseBrowserClient, isDemoMode, isSupabaseConfigured } from "@/lib/supabase-browser";

const DEMO_WORKSPACE_KEY = "talk-to-us:workspace:v1";
const DEMO_SESSION_KEY = "talk-to-us:session:v1";

interface WorkspaceData {
  ideas: Idea[];
  comments: IdeaComment[];
  events: IdeaEvent[];
  attachments: IdeaAttachment[];
  categories: Category[];
  profiles: Profile[];
}

interface IdeaInput {
  title: string;
  description: string;
  categoryId: string;
  estimatedCost: number | null;
  costCurrency: string;
  budgetPeriod: string | null;
}

interface BudgetInput {
  estimatedCost: number | null;
  costCurrency: string;
  budgetPeriod: string | null;
  approvedAmount: number | null;
  actualSpend: number | null;
  note?: string;
}

interface PortalContextValue extends WorkspaceData {
  initialized: boolean;
  loading: boolean;
  backendConfigured: boolean;
  demo: boolean;
  user: Profile | null;
  error: string | null;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signInDemo: (role: UserRole) => void;
  signOut: () => Promise<void>;
  refreshData: () => Promise<void>;
  createIdea: (input: IdeaInput, files: File[]) => Promise<string>;
  addComment: (ideaId: string, body: string) => Promise<void>;
  updateIdeaStatus: (ideaId: string, status: Idea["status"], note: string) => Promise<void>;
  assignIdea: (ideaId: string, profileId: string | null, note?: string) => Promise<void>;
  updateBudget: (ideaId: string, budget: BudgetInput) => Promise<void>;
  updateUser: (profileId: string, role: UserRole, isActive: boolean) => Promise<void>;
  createCategory: (name: string) => Promise<void>;
  setCategoryActive: (categoryId: string, active: boolean) => Promise<void>;
  openAttachment: (attachment: IdeaAttachment) => Promise<string | null>;
}

const emptyWorkspace: WorkspaceData = {
  ideas: [],
  comments: [],
  events: [],
  attachments: [],
  categories: [],
  profiles: [],
};

function seedWorkspace(): WorkspaceData {
  return {
    ideas: DEMO_IDEAS,
    comments: DEMO_COMMENTS,
    events: DEMO_EVENTS,
    attachments: DEMO_ATTACHMENTS,
    categories: DEMO_CATEGORIES,
    profiles: DEMO_PROFILES,
  };
}

function readDemoWorkspace(): WorkspaceData {
  try {
    const saved = window.localStorage.getItem(DEMO_WORKSPACE_KEY);
    if (saved) return { ...seedWorkspace(), ...JSON.parse(saved) } as WorkspaceData;
  } catch {
    window.localStorage.removeItem(DEMO_WORKSPACE_KEY);
  }
  return seedWorkspace();
}

function readDemoUser(): Profile | null {
  try {
    const savedId = window.localStorage.getItem(DEMO_SESSION_KEY);
    return DEMO_PROFILES.find((profile) => profile.id === savedId) ?? null;
  } catch {
    return null;
  }
}

function createLocalId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function eventFor(
  ideaId: string,
  actorId: string,
  type: IdeaEvent["event_type"],
  values: Partial<Pick<IdeaEvent, "from_status" | "to_status" | "note">> = {},
): IdeaEvent {
  return {
    id: createLocalId("event"),
    idea_id: ideaId,
    actor_id: actorId,
    event_type: type,
    from_status: null,
    to_status: null,
    note: null,
    created_at: new Date().toISOString(),
    ...values,
  };
}

function commentFor(ideaId: string, authorId: string, body: string): IdeaComment {
  return {
    id: createLocalId("comment"),
    idea_id: ideaId,
    author_id: authorId,
    body,
    created_at: new Date().toISOString(),
  };
}

function validateOptionalNote(value: string | null | undefined): string {
  const note = value?.trim() ?? "";
  if (note.length === 1) throw new Error("A discussion reply must contain at least two characters.");
  if (note.length > 1000) throw new Error("Keep notes under 1,000 characters.");
  return note;
}

function validateFiles(files: File[]): void {
  if (files.length > FILE_COUNT_LIMIT) {
    throw new Error(`Choose up to ${FILE_COUNT_LIMIT} files.`);
  }
  for (const file of files) {
    const error = getFileError(file);
    if (error) throw new Error(error);
  }
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > FILE_LIMIT * FILE_COUNT_LIMIT) {
    throw new Error("The total upload size is too large.");
  }
}

async function sendEmailNotification(
  ideaId: string,
  eventType: "new_idea" | "new_comment" | "status_change",
  sourceId: string,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ideaId, eventType, sourceId }),
    });
    if (!response.ok) console.warn("Email notification could not be queued.", response.status);
  } catch (error) {
    console.warn("Email notification could not be queued.", error);
  }
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceData>(emptyWorkspace);
  const [user, setUser] = useState<Profile | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const refreshData = useCallback(async () => {
    if (isDemoMode) {
      const nextWorkspace = readDemoWorkspace();
      setWorkspace(nextWorkspace);
      return;
    }
    if (!isSupabaseConfigured) return;

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const [categories, profiles, ideas, comments, events, attachments] = await Promise.all([
        supabase.from("categories").select("id,name,color,is_active,created_at").order("name"),
        supabase.from("profiles").select("id,display_name,role,is_active,created_at").order("display_name"),
        supabase.from("ideas").select("*").order("created_at", { ascending: false }),
        supabase.from("idea_comments").select("id,idea_id,author_id,body,created_at").order("created_at"),
        supabase.from("idea_events").select("id,idea_id,actor_id,event_type,from_status,to_status,note,created_at").order("created_at"),
        supabase.from("idea_attachments").select("id,idea_id,uploaded_by,storage_path,file_name,mime_type,size_bytes,created_at").order("created_at"),
      ]);
      const failure = [categories, profiles, ideas, comments, events, attachments].find((result) => result.error);
      if (failure?.error) throw failure.error;
      setWorkspace({
        categories: (categories.data ?? []) as Category[],
        profiles: (profiles.data ?? []) as Profile[],
        ideas: (ideas.data ?? []) as Idea[],
        comments: (comments.data ?? []) as IdeaComment[],
        events: (events.data ?? []) as IdeaEvent[],
        attachments: (attachments.data ?? []) as IdeaAttachment[],
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not load the workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async (userId: string, email?: string): Promise<Profile | null> => {
    const supabase = getSupabaseBrowserClient();
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id,display_name,role,is_active,created_at")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!data) return null;
    return { ...data, email } as Profile;
  }, []);

  useEffect(() => {
    let active = true;
    if (isDemoMode) {
      queueMicrotask(() => {
        if (!active) return;
        setWorkspace(readDemoWorkspace());
        setUser(readDemoUser());
        setInitialized(true);
      });
      return () => {
        active = false;
      };
    }
    if (!isSupabaseConfigured) {
      queueMicrotask(() => {
        if (active) setInitialized(true);
      });
      return () => {
        active = false;
      };
    }

    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const authUser = data.session?.user;
      if (!authUser) {
        setUser(null);
        setWorkspace(emptyWorkspace);
        setInitialized(true);
        return;
      }
      try {
        const profile = await loadProfile(authUser.id, authUser.email);
        if (!active) return;
        setUser(profile);
        setInitialized(true);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Your account profile could not be loaded.");
        setInitialized(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (!active) return;
        if (!session?.user) {
          setUser(null);
          setWorkspace(emptyWorkspace);
          setInitialized(true);
          return;
        }
        void loadProfile(session.user.id, session.user.email)
          .then((profile) => {
            if (active) {
              setUser(profile);
              setInitialized(true);
            }
          })
          .catch((cause: unknown) => {
            if (active) {
              setError(cause instanceof Error ? cause.message : "Your account profile could not be loaded.");
              setInitialized(true);
            }
          });
      });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    if (user && isSupabaseConfigured) queueMicrotask(() => void refreshData());
  }, [user, refreshData]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;
    const profile = await loadProfile(data.user.id, data.user.email);
    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      throw new Error("This account is not active. Ask a super admin for access.");
    }
    setUser(profile);
    await refreshData();
  }, [loadProfile, refreshData]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name.trim() } },
    });
    if (authError) throw authError;
    if (!data.session) return false;
    if (!data.user) return false;
    const profile = await loadProfile(data.user.id, data.user.email);
    if (profile) setUser(profile);
    await refreshData();
    return true;
  }, [loadProfile, refreshData]);

  const signInDemo = useCallback((role: UserRole) => {
    if (!isDemoMode) throw new Error("Demo access is available only in local development.");
    const demoUser = DEMO_PROFILES.find((profile) => profile.role === role);
    if (!demoUser) throw new Error("That demo account could not be found.");
    window.localStorage.setItem(DEMO_SESSION_KEY, demoUser.id);
    setWorkspace(readDemoWorkspace());
    setUser(demoUser);
    setError(null);
  }, []);

  const signOut = useCallback(async () => {
    if (isDemoMode) {
      window.localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      return;
    }
    await getSupabaseBrowserClient().auth.signOut();
    setUser(null);
    setWorkspace(emptyWorkspace);
  }, []);

  const commitDemoWorkspace = useCallback((next: WorkspaceData) => {
    setWorkspace(next);
    window.localStorage.setItem(DEMO_WORKSPACE_KEY, JSON.stringify(next));
  }, []);

  const createIdea = useCallback(async (input: IdeaInput, files: File[]) => {
    if (!user) throw new Error("Sign in before submitting an idea.");
    const parsed = ideaFormSchema.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check the form fields.");
    validateFiles(files);

    if (isDemoMode) {
      const now = new Date().toISOString();
      const id = createLocalId("idea");
      const idea: Idea = {
        id,
        title: parsed.data.title,
        description: parsed.data.description,
        category_id: parsed.data.categoryId,
        submitted_by: user.id,
        status: "submitted",
        estimated_cost: parsed.data.estimatedCost,
        cost_currency: parsed.data.costCurrency,
        budget_period: parsed.data.budgetPeriod,
        approved_amount: null,
        actual_spend: null,
        assigned_to: null,
        created_at: now,
        updated_at: now,
        resolved_at: null,
      };
      const attachments = files.map((file) => ({
        id: createLocalId("file"),
        idea_id: id,
        uploaded_by: user.id,
        storage_path: `demo/${id}/${file.name}`,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        created_at: now,
      }));
      commitDemoWorkspace({
        ...workspace,
        ideas: [idea, ...workspace.ideas],
        events: [eventFor(id, user.id, "submitted", { to_status: "submitted" }), ...workspace.events],
        attachments: [...workspace.attachments, ...attachments],
      });
      return id;
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error: insertError } = await supabase
      .from("ideas")
      .insert({
        title: parsed.data.title,
        description: parsed.data.description,
        category_id: parsed.data.categoryId,
        submitted_by: user.id,
        estimated_cost: parsed.data.estimatedCost,
        cost_currency: parsed.data.costCurrency,
        budget_period: parsed.data.budgetPeriod,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;
    const uploadedPaths: string[] = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
      const path = `${data.id}/${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("idea-files").upload(path, file, {
        contentType: file.type || Object.keys(ALLOWED_FILE_TYPES).find((type) => ALLOWED_FILE_TYPES[type]?.includes(`.${safeName.split(".").pop()?.toLowerCase()}`)),
        upsert: false,
      });
      if (uploadError) {
        await supabase.storage.from("idea-files").remove(uploadedPaths);
        throw uploadError;
      }
      uploadedPaths.push(path);
      const { error: metadataError } = await supabase.from("idea_attachments").insert({
        idea_id: data.id,
        uploaded_by: user.id,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });
      if (metadataError) {
        await supabase.storage.from("idea-files").remove(uploadedPaths);
        throw metadataError;
      }
    }
    const { data: historyEvent } = await supabase
      .from("idea_events")
      .select("id")
      .eq("idea_id", data.id)
      .eq("event_type", "submitted")
      .eq("actor_id", user.id)
      .maybeSingle();
    if (historyEvent) await sendEmailNotification(data.id, "new_idea", historyEvent.id);
    await refreshData();
    return data.id;
  }, [commitDemoWorkspace, refreshData, user, workspace]);

  const addComment = useCallback(async (ideaId: string, body: string) => {
    if (!user) throw new Error("Sign in before replying.");
    const idea = workspace.ideas.find((item) => item.id === ideaId);
    if (!idea) throw new Error("This idea could not be found.");
    if (!isAdmin(user.role) && idea.submitted_by !== user.id) {
      throw new Error("Only the submitter and admin team can reply to this idea.");
    }
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your reply.");
    if (isDemoMode) {
      const comment = commentFor(ideaId, user.id, parsed.data);
      commitDemoWorkspace({ ...workspace, comments: [...workspace.comments, comment] });
      return;
    }
    const { data: comment, error: insertError } = await getSupabaseBrowserClient()
      .from("idea_comments")
      .insert({ idea_id: ideaId, author_id: user.id, body: parsed.data })
      .select("id")
      .single();
    if (insertError) throw insertError;
    await sendEmailNotification(ideaId, "new_comment", comment.id);
    await refreshData();
  }, [commitDemoWorkspace, refreshData, user, workspace]);

  const updateIdeaStatus = useCallback(async (ideaId: string, status: Idea["status"], note: string) => {
    if (!user) throw new Error("Sign in before updating an idea.");
    if (!isAdmin(user.role)) throw new Error("Only an admin can update an idea's status.");
    const idea = workspace.ideas.find((item) => item.id === ideaId);
    if (!idea) throw new Error("This idea could not be found.");
    const cleanNote = validateOptionalNote(note);
    if (idea.status === status) return;
    if (isDemoMode) {
      const updatedAt = new Date().toISOString();
      commitDemoWorkspace({
        ...workspace,
        ideas: workspace.ideas.map((item) => item.id === ideaId
          ? { ...item, status, updated_at: updatedAt, resolved_at: ["resolved", "closed", "declined", "duplicate"].includes(status) ? updatedAt : null }
          : item),
        events: [eventFor(ideaId, user.id, "status_changed", { from_status: idea.status, to_status: status }), ...workspace.events],
        comments: cleanNote ? [...workspace.comments, commentFor(ideaId, user.id, cleanNote)] : workspace.comments,
      });
      return;
    }
    const { data: historyEventId, error: updateError } = await getSupabaseBrowserClient().rpc("set_idea_status", {
      p_idea_id: ideaId,
      p_status: status,
      p_note: cleanNote || null,
    });
    if (updateError) throw updateError;
    if (historyEventId) await sendEmailNotification(ideaId, "status_change", historyEventId);
    await refreshData();
  }, [commitDemoWorkspace, refreshData, user, workspace]);

  const assignIdea = useCallback(async (ideaId: string, profileId: string | null, note = "") => {
    if (!user) throw new Error("Sign in before assigning an idea.");
    if (!isAdmin(user.role)) throw new Error("Only an admin can assign an idea.");
    const idea = workspace.ideas.find((item) => item.id === ideaId);
    if (!idea) throw new Error("This idea could not be found.");
    const cleanNote = validateOptionalNote(note);
    if (isDemoMode) {
      commitDemoWorkspace({
        ...workspace,
        ideas: workspace.ideas.map((item) => item.id === ideaId
          ? { ...item, assigned_to: profileId, updated_at: new Date().toISOString() }
          : item),
        events: profileId !== idea.assigned_to
          ? [eventFor(ideaId, user.id, "assigned"), ...workspace.events]
          : workspace.events,
        comments: cleanNote ? [...workspace.comments, commentFor(ideaId, user.id, cleanNote)] : workspace.comments,
      });
      return;
    }
    const { data: commentId, error: updateError } = await getSupabaseBrowserClient().rpc("set_idea_assignment", {
      p_idea_id: ideaId,
      p_assigned_to: profileId,
      p_note: cleanNote || null,
    });
    if (updateError) throw updateError;
    if (commentId) await sendEmailNotification(ideaId, "new_comment", commentId);
    await refreshData();
  }, [commitDemoWorkspace, refreshData, user, workspace]);

  const updateBudget = useCallback(async (ideaId: string, budget: BudgetInput) => {
    if (!user) throw new Error("Sign in before updating the budget.");
    if (!isAdmin(user.role)) throw new Error("Only an admin can update an idea's budget.");
    const idea = workspace.ideas.find((item) => item.id === ideaId);
    if (!idea) throw new Error("This idea could not be found.");
    const cleanNote = validateOptionalNote(budget.note);
    for (const value of [budget.estimatedCost, budget.approvedAmount, budget.actualSpend]) {
      if (value !== null && (!Number.isFinite(value) || value < 0)) {
        throw new Error("Budget amounts must be zero or more.");
      }
    }
    if (isDemoMode) {
      const normalizedCurrency = budget.costCurrency.toUpperCase();
      const hasBudgetChange = idea.estimated_cost !== budget.estimatedCost
        || idea.cost_currency !== normalizedCurrency
        || idea.budget_period !== budget.budgetPeriod
        || idea.approved_amount !== budget.approvedAmount
        || idea.actual_spend !== budget.actualSpend;
      if (!hasBudgetChange && !cleanNote) return;
      commitDemoWorkspace({
        ...workspace,
        ideas: workspace.ideas.map((item) => item.id === ideaId
          ? {
            ...item,
            estimated_cost: budget.estimatedCost,
            cost_currency: normalizedCurrency,
            budget_period: budget.budgetPeriod,
            approved_amount: budget.approvedAmount,
            actual_spend: budget.actualSpend,
            updated_at: new Date().toISOString(),
          }
          : item),
        events: hasBudgetChange ? [eventFor(ideaId, user.id, "budget_updated"), ...workspace.events] : workspace.events,
        comments: cleanNote ? [...workspace.comments, commentFor(ideaId, user.id, cleanNote)] : workspace.comments,
      });
      return;
    }
    const { data: commentId, error: updateError } = await getSupabaseBrowserClient().rpc("set_idea_budget", {
      p_idea_id: ideaId,
      p_estimated_cost: budget.estimatedCost,
      p_cost_currency: budget.costCurrency.toUpperCase(),
      p_budget_period: budget.budgetPeriod,
      p_approved_amount: budget.approvedAmount,
      p_actual_spend: budget.actualSpend,
      p_note: cleanNote || null,
    });
    if (updateError) throw updateError;
    if (commentId) await sendEmailNotification(ideaId, "new_comment", commentId);
    await refreshData();
  }, [commitDemoWorkspace, refreshData, user, workspace]);

  const updateUser = useCallback(async (profileId: string, role: UserRole, isActive: boolean) => {
    if (!user || user.role !== "super_admin") throw new Error("Only a super admin can manage access.");
    if (isDemoMode) {
      commitDemoWorkspace({
        ...workspace,
        profiles: workspace.profiles.map((profile) => profile.id === profileId
          ? { ...profile, role, is_active: isActive }
          : profile),
      });
      return;
    }
    const { error: updateError } = await getSupabaseBrowserClient().rpc("set_user_role", {
      p_user_id: profileId,
      p_role: role,
      p_is_active: isActive,
    });
    if (updateError) throw updateError;
    await refreshData();
  }, [commitDemoWorkspace, refreshData, user, workspace]);

  const createCategory = useCallback(async (name: string) => {
    if (!user || user.role !== "super_admin") throw new Error("Only a super admin can manage categories.");
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 48) throw new Error("Use a category name between 2 and 48 characters.");
    if (workspace.categories.some((category) => category.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error("That category already exists.");
    }
    if (isDemoMode) {
      commitDemoWorkspace({
        ...workspace,
        categories: [...workspace.categories, {
          id: createLocalId("category"),
          name: cleanName,
          color: "#d386a8",
          is_active: true,
          created_at: new Date().toISOString(),
        }],
      });
      return;
    }
    const { error: insertError } = await getSupabaseBrowserClient()
      .from("categories")
      .insert({ name: cleanName });
    if (insertError) throw insertError;
    await refreshData();
  }, [commitDemoWorkspace, refreshData, user, workspace]);

  const setCategoryActive = useCallback(async (categoryId: string, active: boolean) => {
    if (!user || user.role !== "super_admin") throw new Error("Only a super admin can manage categories.");
    if (isDemoMode) {
      commitDemoWorkspace({
        ...workspace,
        categories: workspace.categories.map((category) => category.id === categoryId
          ? { ...category, is_active: active }
          : category),
      });
      return;
    }
    const { error: updateError } = await getSupabaseBrowserClient()
      .from("categories")
      .update({ is_active: active })
      .eq("id", categoryId);
    if (updateError) throw updateError;
    await refreshData();
  }, [commitDemoWorkspace, refreshData, user, workspace]);

  const openAttachment = useCallback(async (attachment: IdeaAttachment) => {
    if (!user) throw new Error("Sign in to open this file.");
    const idea = workspace.ideas.find((item) => item.id === attachment.idea_id);
    if (!idea || (!isAdmin(user.role) && idea.submitted_by !== user.id)) {
      throw new Error("Only the submitter and admin team can open this file.");
    }
    if (isDemoMode) return null;
    const { data, error: urlError } = await getSupabaseBrowserClient()
      .storage.from("idea-files")
      .createSignedUrl(attachment.storage_path, 60);
    if (urlError) throw urlError;
    return data.signedUrl;
  }, [user, workspace.ideas]);

  const value = useMemo<PortalContextValue>(() => ({
    ...workspace,
    initialized,
    loading,
    backendConfigured: isSupabaseConfigured,
    demo: isDemoMode,
    user,
    error,
    clearError,
    signIn,
    signUp,
    signInDemo,
    signOut,
    refreshData,
    createIdea,
    addComment,
    updateIdeaStatus,
    assignIdea,
    updateBudget,
    updateUser,
    createCategory,
    setCategoryActive,
    openAttachment,
  }), [
    workspace,
    initialized,
    loading,
    user,
    error,
    clearError,
    signIn,
    signUp,
    signInDemo,
    signOut,
    refreshData,
    createIdea,
    addComment,
    updateIdeaStatus,
    assignIdea,
    updateBudget,
    updateUser,
    createCategory,
    setCategoryActive,
    openAttachment,
  ]);

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal(): PortalContextValue {
  const value = useContext(PortalContext);
  if (!value) throw new Error("usePortal must be used inside PortalProvider.");
  return value;
}
