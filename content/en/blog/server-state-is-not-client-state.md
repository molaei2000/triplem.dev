---
title: Server state is not client state
description: Why a data-heavy app gets simpler when TanStack Query owns what the server knows and Redux Toolkit owns only what the browser decides.
date: 2026-09-12
tags: [Architecture, React]
draft: true
---

Most state bugs I've fixed weren't logic bugs. They were ownership bugs: two places believed they owned the same data, and they disagreed.

## Two kinds of state

Server state lives somewhere else. You borrow a snapshot, it goes stale, someone else can change it, and you need caching, deduplication and background refetching to keep it honest.

Client state is the opposite. The browser is the source of truth: an open dialog, a half-filled form, the step you're on in a booking flow. Putting both in one global store means rebuilding a cache by hand, and usually badly.

## Give each one an owner

On a legal-consultation platform I worked on, TanStack Query owned everything that came from the API, and Redux Toolkit kept only what the interface decided on its own.

```ts [booking.ts]
// Server state: cached, deduplicated, refetched in the background.
export function useLawyer(id: string) {
  return useQuery({
    queryKey: ["lawyer", id],
    queryFn: () => api.lawyers.get(id),
    staleTime: 60_000,
  });
}

// Client state: only what the browser decides.
const booking = createSlice({
  name: "booking",
  initialState: { step: "time" as Step, slotId: null as string | null },
  reducers: {
    pickSlot(state, action: PayloadAction<string>) {
      state.slotId = action.payload;
      state.step = "payment";
    },
  },
});
```

The slice never stores a lawyer, a price or a list of free slots. It stores an id and a step; everything else is read from the query cache when it's needed.

## The test

Ask one question of every piece of state: *who can change this besides us?* If the answer is "the server", it doesn't belong in the store.

> Stores hold decisions. Queries hold facts.
