-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Performances
create table performances (
  id uuid primary key default uuid_generate_v4(),
  kopis_id text unique,
  title text not null,
  venue text,
  start_date date,
  end_date date,
  genre text check (genre in ('musical', 'play')),
  status text check (status in ('ongoing', 'upcoming', 'ended')),
  created_at timestamptz default now()
);

-- Actors
create table actors (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  created_at timestamptz default now()
);

-- Performance-Actor mapping
create table performance_actors (
  performance_id uuid references performances on delete cascade,
  actor_id uuid references actors on delete cascade,
  primary key (performance_id, actor_id)
);

-- Castings (fan reports)
create table castings (
  id uuid primary key default uuid_generate_v4(),
  performance_id uuid references performances on delete cascade,
  cast_date date not null,
  time_slot text check (time_slot in ('14:00', '19:30', 'other')),
  roles jsonb default '[]',
  reported_by uuid references auth.users on delete set null,
  created_at timestamptz default now()
);

-- Posts
create table posts (
  id uuid primary key default uuid_generate_v4(),
  type text check (type in ('general', 'casting')),
  board text check (board in ('performance', 'actor', 'tips')),
  performance_id uuid references performances on delete cascade,
  actor_id uuid references actors on delete cascade,
  cast_date date,
  tag text,
  title text not null,
  content_blocks jsonb default '[]',
  user_id uuid references auth.users on delete cascade,
  likes_count int default 0,
  comments_count int default 0,
  is_hidden bool default false,
  created_at timestamptz default now()
);

-- Comments
create table comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts on delete cascade,
  parent_id uuid references comments on delete cascade,
  depth int default 0,
  content text not null,
  images jsonb default '[]',
  user_id uuid references auth.users on delete cascade,
  likes_count int default 0,
  is_hidden bool default false,
  created_at timestamptz default now()
);

-- Bookmarks
create table bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  performance_id uuid references performances on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, performance_id)
);

-- Actor follows
create table actor_follows (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  actor_id uuid references actors on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, actor_id)
);

-- Watch logs
create table watch_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  performance_id uuid references performances on delete cascade,
  watch_date date,
  seat text,
  casting text,
  rating int check (rating between 1 and 5),
  memo text,
  created_at timestamptz default now()
);

-- Likes
create table likes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  target_type text check (target_type in ('post', 'comment')),
  target_id uuid not null,
  created_at timestamptz default now(),
  unique(user_id, target_type, target_id)
);

-- Notifications
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  type text check (type in ('new_post', 'casting_update', 'comment')),
  performance_id uuid references performances on delete cascade,
  post_id uuid references posts on delete cascade,
  is_read bool default false,
  created_at timestamptz default now()
);

-- Reports
create table reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references auth.users on delete cascade,
  target_type text check (target_type in ('post', 'comment', 'user')),
  target_id uuid not null,
  category text check (category in ('spam', 'hate', 'false_info', 'illegal', 'etc')),
  description text,
  status text default 'pending' check (status in ('pending', 'reviewed', 'resolved')),
  created_at timestamptz default now()
);

-- Blocks
create table blocks (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid references auth.users on delete cascade,
  blocked_id uuid references auth.users on delete cascade,
  created_at timestamptz default now(),
  unique(blocker_id, blocked_id)
);

-- User profiles
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_posts_performance_id on posts(performance_id);
create index idx_posts_actor_id on posts(actor_id);
create index idx_posts_created_at on posts(created_at desc);
create index idx_posts_likes_count on posts(likes_count desc);
create index idx_comments_post_id on comments(post_id);
create index idx_comments_parent_id on comments(parent_id);
create index idx_castings_performance_date on castings(performance_id, cast_date);
create index idx_bookmarks_user_id on bookmarks(user_id);
create index idx_notifications_user_id on notifications(user_id);

-- Triggers for auto-count

-- likes_count on posts
create or replace function update_post_likes_count()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT' and new.target_type = 'post') then
    update posts set likes_count = likes_count + 1 where id = new.target_id;
  elsif (TG_OP = 'DELETE' and old.target_type = 'post') then
    update posts set likes_count = greatest(0, likes_count - 1) where id = old.target_id;
  end if;
  return null;
end;
$$;

create trigger trg_post_likes_count
after insert or delete on likes
for each row execute function update_post_likes_count();

-- likes_count on comments
create or replace function update_comment_likes_count()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT' and new.target_type = 'comment') then
    update comments set likes_count = likes_count + 1 where id = new.target_id;
  elsif (TG_OP = 'DELETE' and old.target_type = 'comment') then
    update comments set likes_count = greatest(0, likes_count - 1) where id = old.target_id;
  end if;
  return null;
end;
$$;

create trigger trg_comment_likes_count
after insert or delete on likes
for each row execute function update_comment_likes_count();

-- comments_count on posts
create or replace function update_post_comments_count()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    update posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif (TG_OP = 'DELETE') then
    update posts set comments_count = greatest(0, comments_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger trg_post_comments_count
after insert or delete on comments
for each row execute function update_post_comments_count();

-- RLS

alter table performances enable row level security;
alter table actors enable row level security;
alter table performance_actors enable row level security;
alter table castings enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table bookmarks enable row level security;
alter table actor_follows enable row level security;
alter table watch_logs enable row level security;
alter table likes enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
alter table blocks enable row level security;
alter table profiles enable row level security;

-- performances: public read, admin write
create policy "performances_read" on performances for select using (true);

-- actors: public read
create policy "actors_read" on actors for select using (true);
create policy "performance_actors_read" on performance_actors for select using (true);

-- castings: public read, auth write
create policy "castings_read" on castings for select using (true);
create policy "castings_insert" on castings for insert with check (auth.uid() is not null);

-- posts: public read (excluding hidden and blocked), auth write
create policy "posts_read" on posts for select using (
  (is_hidden = false or user_id = auth.uid()) and
  not exists (
    select 1 from blocks where blocker_id = auth.uid() and blocked_id = posts.user_id
  )
);
create policy "posts_insert" on posts for insert with check (auth.uid() = user_id);
create policy "posts_update" on posts for update using (auth.uid() = user_id);
create policy "posts_delete" on posts for delete using (auth.uid() = user_id);

-- comments: similar to posts
create policy "comments_read" on comments for select using (
  (is_hidden = false or user_id = auth.uid()) and
  not exists (
    select 1 from blocks where blocker_id = auth.uid() and blocked_id = comments.user_id
  )
);
create policy "comments_insert" on comments for insert with check (auth.uid() = user_id);
create policy "comments_update" on comments for update using (auth.uid() = user_id);
create policy "comments_delete" on comments for delete using (auth.uid() = user_id);

-- bookmarks, actor_follows, watch_logs, likes: own data only
create policy "bookmarks_own" on bookmarks for all using (auth.uid() = user_id);
create policy "actor_follows_own" on actor_follows for all using (auth.uid() = user_id);
create policy "watch_logs_own" on watch_logs for all using (auth.uid() = user_id);
create policy "likes_own" on likes for all using (auth.uid() = user_id);

-- notifications: own read/update
create policy "notifications_read" on notifications for select using (auth.uid() = user_id);
create policy "notifications_update" on notifications for update using (auth.uid() = user_id);

-- reports: auth insert, own read
create policy "reports_insert" on reports for insert with check (auth.uid() = reporter_id);
create policy "reports_read" on reports for select using (auth.uid() = reporter_id);

-- blocks: own data
create policy "blocks_own" on blocks for all using (auth.uid() = blocker_id);

-- profiles: own write, public read
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_own" on profiles for all using (auth.uid() = id);
