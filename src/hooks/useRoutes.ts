import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getRoutes, getRouteById } from "@/services/routes";
import {
  cloneSuggestedRoute,
  createUserRoute,
  deleteUserRoute,
  getUserRouteById,
  getUserRoutes,
  markStopVisited,
  replaceUserRouteStops,
  startUserRoute,
  updateUserRoute,
  updateUserRouteStatus,
  updateUserRouteStop,
  type UpdateStopInput,
} from "@/services/userRoutes";

export const routesKeys = {
  suggested: ["routes", "suggested"] as const,
  suggestedById: (id: string) => ["routes", "suggested", id] as const,
  mine: (uid: string | null) => ["routes", "mine", uid] as const,
  mineById: (id: string) => ["routes", "mine", "byId", id] as const,
};

export function useSuggestedRoutes() {
  return useQuery({
    queryKey: routesKeys.suggested,
    queryFn: async () => {
      const { data, error } = await getRoutes();
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSuggestedRoute(id: string | undefined) {
  return useQuery({
    queryKey: id ? routesKeys.suggestedById(id) : ["routes", "suggested", "none"],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await getRouteById(id!);
      if (error) throw error;
      return data;
    },
  });
}

export function useMyRoutes() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  return useQuery({
    queryKey: routesKeys.mine(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await getUserRoutes(uid!);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });
}

export function useMyRoute(id: string | undefined) {
  return useQuery({
    queryKey: id ? routesKeys.mineById(id) : ["routes", "mine", "byId", "none"],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await getUserRouteById(id!);
      if (error) throw error;
      return data;
    },
  });
}

function invalidateMine(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["routes", "mine"] });
}

export function useCreateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Parameters<typeof createUserRoute>[0]) => {
      const { data, error } = await createUserRoute(input);
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateMine(qc),
  });
}

export function useUpdateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; input: Parameters<typeof updateUserRoute>[1]; stopIds?: string[] }) => {
      const { error } = await updateUserRoute(vars.id, vars.input);
      if (error) throw error;
      if (vars.stopIds) {
        const { error: stopsErr } = await replaceUserRouteStops(vars.id, vars.stopIds);
        if (stopsErr) throw stopsErr;
      }
      return vars.id;
    },
    onSuccess: () => invalidateMine(qc),
  });
}

export function useDeleteRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteUserRoute(id);
      if (error) throw error;
    },
    onSuccess: () => invalidateMine(qc),
  });
}

export function useStartRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const r = await startUserRoute(id);
      if ((r as any).error) throw (r as any).error;
      return id;
    },
    onSuccess: () => invalidateMine(qc),
  });
}

export function useMarkStopVisited() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { stopId: string; visited: boolean }) => {
      const { error } = await markStopVisited(vars.stopId, vars.visited);
      if (error) throw error;
    },
    onSuccess: () => invalidateMine(qc),
  });
}

export function useUpdateStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { stopId: string; input: UpdateStopInput }) => {
      const { error } = await updateUserRouteStop(vars.stopId, vars.input);
      if (error) throw error;
    },
    onSuccess: () => invalidateMine(qc),
  });
}
export function useUpdateRouteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: Parameters<typeof updateUserRouteStatus>[1] }) => {
      const { error } = await updateUserRouteStatus(vars.id, vars.status);
      if (error) throw error;
    },
    onSuccess: () => invalidateMine(qc),
  });
}

export function useCloneSuggestedRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (suggestedId: string) => {
      const { data, error } = await cloneSuggestedRoute(suggestedId);
      if (error) throw error;
      return (data as any)?.user_route_id as string | undefined;
    },
    onSuccess: () => invalidateMine(qc),
  });
}
