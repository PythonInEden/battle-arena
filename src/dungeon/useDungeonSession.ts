import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const getOrCreateClientSessionId = (): string => {
  let sessionId = localStorage.getItem('dungeon_client_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('dungeon_client_session_id', sessionId);
  }
  return sessionId;
};

export interface DungeonPlayerState {
  id: number;
  room_code: string;
  player_name: string;
  hero_class: string;
  hero_gender?: 'male' | 'female';
  target_gold: number;
  current_gold: number;
  pos_x: number;
  pos_y: number;
  is_ready: boolean;
  connection_status: 'ONLINE' | 'DISCONNECTED' | 'BOT_CONTROLLED';
  client_session_id: string;
}

export function useDungeonSession(roomCode: string) {
  const [clientSessionId] = useState<string>(getOrCreateClientSessionId);
  const [player, setPlayer] = useState<DungeonPlayerState | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<DungeonPlayerState[]>([]);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(true);
  const channelRef = useRef<any>(null);

  // 1. Fetch full room roster and keep local player in sync
  const fetchRoster = useCallback(async () => {
    if (!roomCode) return;
    const { data } = await supabase
      .from('dungeon_players')
      .select('*')
      .eq('room_code', roomCode);

    if (data) {
      const roster = data as DungeonPlayerState[];
      setLobbyPlayers(roster);
      
      // 🛠️ CRITICAL FIX: Keep active player state in sync with latest DB roster
      const me = roster.find(p => p.client_session_id === clientSessionId);
      if (me) setPlayer(me);
    }
  }, [roomCode, clientSessionId]);

  // 2. Reconnect / Restore player session
  const restoreSession = useCallback(async () => {
    if (!roomCode) {
      setIsReconnecting(false);
      return;
    }

    setIsReconnecting(true);

    const { data, error } = await supabase.rpc('reconnect_dungeon_player', {
      p_room_code: roomCode,
      p_client_session_id: clientSessionId
    });

    if (!error && data && data.length > 0) {
      setPlayer(data[0] as DungeonPlayerState);
    }

    await fetchRoster();
    setIsReconnecting(false);
  }, [roomCode, clientSessionId, fetchRoster]);

  // 3. Realtime Listener
  useEffect(() => {
    if (!roomCode) return;

    restoreSession();

    const roomChannel = supabase.channel(`dungeon_room_${roomCode}`, {
      config: { presence: { key: clientSessionId } }
    });

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        fetchRoster();
      })
      .on('presence', { event: 'leave' }, async ({ key }) => {
        await supabase
          .from('dungeon_players')
          .update({ connection_status: 'DISCONNECTED' })
          .eq('client_session_id', key)
          .eq('room_code', roomCode);

        fetchRoster();
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dungeon_players', filter: `room_code=eq.${roomCode}` },
        () => fetchRoster()
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await roomChannel.track({
            client_session_id: clientSessionId,
            online_at: new Date().toISOString()
          });
        }
      });

    channelRef.current = roomChannel;

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomCode, clientSessionId, restoreSession, fetchRoster]);

  return {
    clientSessionId,
    player,
    lobbyPlayers,
    isReconnecting,
    reconnect: restoreSession,
    refreshRoster: fetchRoster
  };
}