import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type RemoteApplication = { id: string; title: string; company: string; location: string; stage: string; job_url?: string | null; match_score?: number | null };
export type RemotePost = { id: string; category: string; author: string; time: string; content: string; likes: number; anonymous: boolean };
export type UserProfile = { id: string; display_name: string; headline: string; avatar_url: string | null };

export function useRenovaSupabase() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<RemoteApplication[]>([]);
  const [posts, setPosts] = useState<RemotePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);

  const loadUserData = useCallback(async (activeUser: User) => {
    const [profileResult, applicationsResult, postsResult] = await Promise.all([
      supabase.from("profiles").select("id,display_name,headline,avatar_url").eq("id", activeUser.id).maybeSingle(),
      supabase.from("applications").select("id,title,company,location,stage,job_url,match_score").order("created_at", { ascending: false }),
      supabase.from("community_posts").select("id,category,content,anonymous,support_count,created_at,author_name").order("created_at", { ascending: false }).limit(60),
    ]);
    if (profileResult.data) setProfile(profileResult.data as UserProfile);
    else {
      const { data } = await supabase.from("profiles").upsert({ id: activeUser.id, display_name: activeUser.user_metadata.display_name || activeUser.email?.split("@")[0] || "" }).select("id,display_name,headline,avatar_url").single();
      if (data) setProfile(data as UserProfile);
    }
    if (applicationsResult.data) setApplications(applicationsResult.data as RemoteApplication[]);
    if (postsResult.data) setPosts(postsResult.data.map((post) => ({ id: post.id, category: post.category, content: post.content, anonymous: post.anonymous, likes: post.support_count, author: post.anonymous ? "Comunidad anónima" : post.author_name, time: new Date(post.created_at).toLocaleDateString("es-MX") })));
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) void loadUserData(currentSession.user).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setProfile(current => current?.id === nextSession?.user.id ? current : null);
      if (nextSession?.user) {
        window.setTimeout(() => void loadUserData(nextSession.user), 0);
      } else {
        setProfile(null);
        setApplications([]);
        setPosts([]);
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    setAuthBusy(true);
    try { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; }
    finally { setAuthBusy(false); }
  };
  const signUp = async (name: string, email: string, password: string) => {
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
      if (error) throw error;
    } finally { setAuthBusy(false); }
  };
  const signOut = () => supabase.auth.signOut();

  const addApplication = async (item: Omit<RemoteApplication, "id">) => {
    if (!user) throw new Error("Inicia sesión para guardar postulaciones.");
    const { data, error } = await supabase.from("applications").insert({ ...item, user_id: user.id }).select("id,title,company,location,stage,job_url,match_score").single();
    if (error) throw error;
    setApplications((current) => [data as RemoteApplication, ...current]);
    return data as RemoteApplication;
  };
  const updateApplication = async (id: string, changes: Partial<RemoteApplication>) => {
    const { data, error } = await supabase.from("applications").update(changes).eq("id", id).select("id,title,company,location,stage,job_url,match_score").single();
    if (error) throw error;
    setApplications((current) => current.map((item) => item.id === id ? data as RemoteApplication : item));
  };
  const deleteApplication = async (id: string) => {
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) throw error;
    setApplications((current) => current.filter((item) => item.id !== id));
  };
  const addPost = async (category: string, content: string, anonymous: boolean) => {
    if (!user) throw new Error("Inicia sesión para publicar.");
    const { data, error } = await supabase.from("community_posts").insert({ user_id: user.id, category, content, anonymous, author_name: anonymous ? "" : profile?.display_name || "Miembro de Renova" }).select("id,category,content,anonymous,support_count,created_at,author_name").single();
    if (error) throw error;
    const post: RemotePost = { id: data.id, category: data.category, content: data.content, anonymous: data.anonymous, likes: data.support_count, author: anonymous ? "Comunidad anónima" : data.author_name, time: "ahora" };
    setPosts((current) => [post, ...current]);
  };
  const supportPost = async (id: string) => {
    const { error } = await supabase.rpc("support_community_post", { post_id: id });
    if (error) throw error;
    setPosts((current) => current.map((post) => post.id === id ? { ...post, likes: post.likes + 1 } : post));
  };
  const searchJobs = async (keywords: string, location: string) => {
    const { data, error } = await supabase.functions.invoke("search-jobs", { body: { keywords, location } });
    if (error) throw error;
    return data.jobs as Array<{ title: string; company: string; location: string; url: string; match: number | null }>;
  };
  const analyzeCv = async (resumeText: string, jobDescription: string, resumeFileBase64?: string, resumeMimeType?: string) => {
    const { data, error } = await supabase.functions.invoke("analyze-cv", { body: { resumeText, jobDescription, resumeFileBase64, resumeMimeType } });
    if (error) {
      let message = error.message;
      if (error.context instanceof Response) {
        const body = await error.context.clone().json().catch(() => null);
        if (typeof body?.error === "string") message = body.error;
      }
      throw new Error(message);
    }
    return data as { matchScore: number; keywordsPresent: string[]; keywordsMissing: string[]; optimizedBullets: Array<{ before: string; after: string }> };
  };
  const uploadAvatar = async (file: File) => {
    if (!user) throw new Error("Inicia sesión para cambiar tu foto.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Usa una imagen JPEG, PNG o WebP.");
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { data: updated, error } = await supabase.from("profiles").update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id).select("id,display_name,headline,avatar_url").single();
    if (error) throw error;
    setProfile(updated as UserProfile);
    return data.publicUrl;
  };

  return { session, user, profile, applications, posts, loading, authBusy, signIn, signUp, signOut, addApplication, updateApplication, deleteApplication, addPost, supportPost, searchJobs, analyzeCv, uploadAvatar, refresh: () => user && loadUserData(user) };
}
