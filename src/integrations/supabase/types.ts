export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _keep_alive_heartbeat: {
        Row: {
          id: number
          pinged_at: string
        }
        Insert: {
          id?: number
          pinged_at?: string
        }
        Update: {
          id?: number
          pinged_at?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          image_url: string | null
          redirect_type: string | null
          redirect_url: string | null
          reference_id: string | null
          scheduled_at: string | null
          segment: string | null
          sent: boolean | null
          sent_at: string | null
          target: string | null
          target_ids: string[] | null
          title: string
          type: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          redirect_type?: string | null
          redirect_url?: string | null
          reference_id?: string | null
          scheduled_at?: string | null
          segment?: string | null
          sent?: boolean | null
          sent_at?: string | null
          target?: string | null
          target_ids?: string[] | null
          title: string
          type?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          redirect_type?: string | null
          redirect_url?: string | null
          reference_id?: string | null
          scheduled_at?: string | null
          segment?: string | null
          sent?: boolean | null
          sent_at?: string | null
          target?: string | null
          target_ids?: string[] | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          condition: string | null
          created_at: string | null
          description: string | null
          icon_name: string
          id: string
          name: string
          total: number | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          description?: string | null
          icon_name: string
          id?: string
          name: string
          total?: number | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          description?: string | null
          icon_name?: string
          id?: string
          name?: string
          total?: number | null
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          created_at: string | null
          establishment_id: string
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          establishment_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          establishment_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "user_checkins_detailed"
            referencedColumns: ["establishment_id"]
          },
        ]
      }
      coupon_rules: {
        Row: {
          coupon_id: string
          created_at: string | null
          current_uses: number | null
          id: string
          max_uses: number | null
          max_uses_per_user: number | null
          min_order_value: number | null
          qr_code_url: string | null
          rules: string | null
          updated_at: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string | null
          current_uses?: number | null
          id?: string
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_value?: number | null
          qr_code_url?: string | null
          rules?: string | null
          updated_at?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string | null
          current_uses?: number | null
          id?: string
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_value?: number | null
          qr_code_url?: string | null
          rules?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_rules_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: true
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          establishment_id: string | null
          expires_at: string
          id: string
          image: string | null
          status: string | null
          title: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          establishment_id?: string | null
          expires_at: string
          id?: string
          image?: string | null
          status?: string | null
          title: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          establishment_id?: string | null
          expires_at?: string
          id?: string
          image?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "user_checkins_detailed"
            referencedColumns: ["establishment_id"]
          },
        ]
      }
      establishment_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          crop_data: Json | null
          establishment_id: string
          height: number | null
          id: string
          sort_order: number | null
          storage_path: string | null
          url: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          crop_data?: Json | null
          establishment_id: string
          height?: number | null
          id?: string
          sort_order?: number | null
          storage_path?: string | null
          url: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          crop_data?: Json | null
          establishment_id?: string
          height?: number | null
          id?: string
          sort_order?: number | null
          storage_path?: string | null
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "establishment_photos_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "establishment_photos_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "user_checkins_detailed"
            referencedColumns: ["establishment_id"]
          },
        ]
      }
      establishments: {
        Row: {
          address: string | null
          category: string
          created_at: string | null
          description: string | null
          distance_km: number | null
          facebook: string | null
          gallery: string[] | null
          hours_friday: string | null
          hours_monday: string | null
          hours_saturday: string | null
          hours_thursday: string | null
          hours_tuesday: string | null
          hours_wednesday: string | null
          id: string
          image_url: string | null
          instagram: string | null
          is_open: boolean | null
          is_popular: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          opening_hours: string | null
          pet_friendly: boolean | null
          phone: string | null
          rating: number | null
          slug: string
          sunday_hours: string | null
          tiktok: string | null
          total_reviews: number | null
          twitter: string | null
          updated_at: string | null
          website: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          address?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          distance_km?: number | null
          facebook?: string | null
          gallery?: string[] | null
          hours_friday?: string | null
          hours_monday?: string | null
          hours_saturday?: string | null
          hours_thursday?: string | null
          hours_tuesday?: string | null
          hours_wednesday?: string | null
          id?: string
          image_url?: string | null
          instagram?: string | null
          is_open?: boolean | null
          is_popular?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          opening_hours?: string | null
          pet_friendly?: boolean | null
          phone?: string | null
          rating?: number | null
          slug: string
          sunday_hours?: string | null
          tiktok?: string | null
          total_reviews?: number | null
          twitter?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          distance_km?: number | null
          facebook?: string | null
          gallery?: string[] | null
          hours_friday?: string | null
          hours_monday?: string | null
          hours_saturday?: string | null
          hours_thursday?: string | null
          hours_tuesday?: string | null
          hours_wednesday?: string | null
          id?: string
          image_url?: string | null
          instagram?: string | null
          is_open?: boolean | null
          is_popular?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          opening_hours?: string | null
          pet_friendly?: boolean | null
          phone?: string | null
          rating?: number | null
          slug?: string
          sunday_hours?: string | null
          tiktok?: string | null
          total_reviews?: number | null
          twitter?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      experiences: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      favorite_folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_events: {
        Row: {
          created_at: string | null
          establishment_id: string | null
          event_type: string
          id: string
          post_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          establishment_id?: string | null
          event_type: string
          id?: string
          post_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          establishment_id?: string | null
          event_type?: string
          id?: string
          post_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_events_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_events_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "user_checkins_detailed"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "feed_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_analytics"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "feed_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      media_uploads: {
        Row: {
          bucket: string
          created_at: string | null
          crop_data: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          original_name: string | null
          public_url: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          bucket?: string
          created_at?: string | null
          crop_data?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          original_name?: string | null
          public_url: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string | null
          crop_data?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          original_name?: string | null
          public_url?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          image_url: string | null
          read: boolean | null
          redirect_type: string | null
          redirect_url: string | null
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          read?: boolean | null
          redirect_type?: string | null
          redirect_url?: string | null
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          read?: boolean | null
          redirect_type?: string | null
          redirect_url?: string | null
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      photo_reaction_counts: {
        Row: {
          count: number | null
          emoji: string
          photo_id: string
        }
        Insert: {
          count?: number | null
          emoji: string
          photo_id: string
        }
        Update: {
          count?: number | null
          emoji?: string
          photo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_reaction_counts_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "establishment_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_reactions_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "establishment_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string | null
          created_at: string | null
          establishment_id: string
          id: string
          image: string | null
          is_popular: boolean | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          establishment_id: string
          id?: string
          image?: string | null
          is_popular?: boolean | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          establishment_id?: string
          id?: string
          image?: string | null
          is_popular?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "user_checkins_detailed"
            referencedColumns: ["establishment_id"]
          },
        ]
      }
      reactions: {
        Row: {
          count: number | null
          emoji: string
          id: string
          post_id: string
        }
        Insert: {
          count?: number | null
          emoji: string
          id?: string
          post_id: string
        }
        Update: {
          count?: number | null
          emoji?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_analytics"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          establishment_id: string
          id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          establishment_id: string
          id?: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          establishment_id?: string
          id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "user_checkins_detailed"
            referencedColumns: ["establishment_id"]
          },
        ]
      }
      route_banners: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          image_url: string
          link_url: string | null
          route_id: string | null
          sort_order: number | null
          title: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          image_url: string
          link_url?: string | null
          route_id?: string | null
          sort_order?: number | null
          title: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          image_url?: string
          link_url?: string | null
          route_id?: string | null
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_banners_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          created_at: string | null
          establishment_id: string
          id: string
          note: string | null
          route_id: string
          stop_order: number
        }
        Insert: {
          created_at?: string | null
          establishment_id: string
          id?: string
          note?: string | null
          route_id: string
          stop_order: number
        }
        Update: {
          created_at?: string | null
          establishment_id?: string
          id?: string
          note?: string | null
          route_id?: string
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "user_checkins_detailed"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          duration: string
          icon_name: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          sort_order: number | null
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration: string
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: string
          icon_name?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      search_queries: {
        Row: {
          created_at: string | null
          id: string
          query: string
          results: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query: string
          results?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string
          results?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          created_at: string | null
          earned: boolean | null
          earned_at: string | null
          id: string
          progress: number | null
          user_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string | null
          earned?: boolean | null
          earned_at?: string | null
          id?: string
          progress?: number | null
          user_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string | null
          earned?: boolean | null
          earned_at?: string | null
          id?: string
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coupons: {
        Row: {
          coupon_id: string
          created_at: string | null
          id: string
          status: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string | null
          id?: string
          status?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string | null
          id?: string
          status?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coupons_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string | null
          establishment_id: string
          folder_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          establishment_id: string
          folder_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          establishment_id?: string
          folder_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "user_checkins_detailed"
            referencedColumns: ["establishment_id"]
          },
          {
            foreignKeyName: "user_favorites_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "favorite_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          email: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          name: string | null
          phone: string | null
          state: string | null
          travel_since: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id: string
          is_active?: boolean | null
          last_seen_at?: string | null
          name?: string | null
          phone?: string | null
          state?: string | null
          travel_since?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          name?: string | null
          phone?: string | null
          state?: string | null
          travel_since?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_analytics"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "user_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_posts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_analytics"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "user_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_timeline: {
        Row: {
          action: string
          created_at: string | null
          establishment_id: string | null
          id: string
          image_url: string | null
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          establishment_id?: string | null
          id?: string
          image_url?: string | null
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_timeline_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_timeline_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "user_checkins_detailed"
            referencedColumns: ["establishment_id"]
          },
        ]
      }
    }
    Views: {
      admin_user_stats: {
        Row: {
          active_this_week: number | null
          active_users: number | null
          female_count: number | null
          gender_unknown: number | null
          male_count: number | null
          new_this_month: number | null
          new_this_week: number | null
          online_today: number | null
          total_users: number | null
        }
        Relationships: []
      }
      feed_analytics: {
        Row: {
          category: string | null
          checkins: number | null
          clicks: number | null
          created_at: string | null
          ctr_pct: number | null
          establishment_name: string | null
          impressions: number | null
          is_popular: boolean | null
          post_id: string | null
          reactions_count: number | null
          saves: number | null
          shares: number | null
          slug: string | null
          total_reactions: number | null
        }
        Relationships: []
      }
      user_checkin_stats: {
        Row: {
          days_active: number | null
          last_checkin_at: string | null
          total_checkins: number | null
          unique_places: number | null
          user_id: string | null
        }
        Relationships: []
      }
      user_checkins_detailed: {
        Row: {
          created_at: string | null
          establishment_address: string | null
          establishment_category: string | null
          establishment_id: string | null
          establishment_image: string | null
          establishment_logo: string | null
          establishment_name: string | null
          establishment_slug: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          note: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_user: { Args: { p_user_id: string }; Returns: Json }
      decrement_reaction: {
        Args: { p_emoji: string; p_post_id: string }
        Returns: undefined
      }
      delete_folder: {
        Args: { p_folder_id: string; p_mode?: string }
        Returns: Json
      }
      get_post_reaction_counts: {
        Args: { p_post_id: string }
        Returns: {
          count: number
          emoji: string
        }[]
      }
      get_user_favorites_with_folders: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          establishment_id: string
          favorite_id: string
          folder_id: string
          folder_name: string
        }[]
      }
      get_user_folders: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          name: string
          total: number
        }[]
      }
      increment_reaction: {
        Args: { p_emoji: string; p_post_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      move_favorite_to_folder: {
        Args: { p_establishment_id: string; p_target_folder_id?: string }
        Returns: Json
      }
      remove_favorite_from_folder: {
        Args: { p_establishment_id: string }
        Returns: Json
      }
      rename_folder: {
        Args: { p_folder_id: string; p_new_name: string }
        Returns: Json
      }
      save_favorite_to_folder: {
        Args: {
          p_establishment_id: string
          p_folder_id?: string
          p_new_folder_name?: string
          p_user_id: string
        }
        Returns: Json
      }
      upsert_photo_reaction: {
        Args: { p_emoji: string; p_photo_id: string; p_user_id: string }
        Returns: Json
      }
      upsert_post_reaction: {
        Args: { p_emoji: string; p_post_id: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
