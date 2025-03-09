<Button
  variant="blue"
  className="flex items-center justify-between w-full"
  onClick={() => openTapAI()}
>
  <div className="flex items-center gap-2">
    <Sparkles className="h-5 w-5" />
    <span>TapAI</span>
  </div>
  <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-white/30 bg-blue-600 px-1.5 font-mono text-[10px] font-medium text-white">
    <span className="text-xs">⌘</span>I
  </kbd>
</Button> 