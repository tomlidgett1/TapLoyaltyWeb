{/* Create Agent Modal */}
<Dialog 
open={isCreateAgentModalOpen} 
onOpenChange={(open) => {
  if (!open) {
    // Reset selected custom agent when closing
    setSelectedCustomAgent(null)
    // Reset form when closing
    setCreateAgentForm({ name: 'New Agent', steps: [''] })
    setCreateAgentSchedule({ frequency: '', time: '12:00', days: [], selectedDay: '' })
    setSelectedTools(new Set())
    setToolsSearchQuery('')
    setSmartCreatePrompt('')
    setShowSmartCreateInput(false)
    setAgentCanvasContent('')
    setShowToolsDropdown(false)
    setToolsDropdownQuery('')
    setSelectedToolIndex(0)
    setFilteredTools([])
    setAtMentionPosition(0)
    setCreateAgentDebugResponse(null)
    setIsInquiriesLoggerMode(false) // Reset simplified UI mode
    setNotificationSettings({
      sendToInbox: true,
      sendViaEmail: false,
      emailAddress: notificationSettings.emailAddress, // Keep the merchant's email
      emailFormat: "professional"
    })
  }
  setIsCreateAgentModalOpen(open)
}}
>
<DialogPortal>
  <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
  <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-5xl h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden p-0">
    <DialogPrimitive.Title className="sr-only">Create Custom Agent</DialogPrimitive.Title>
    <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  <div className="flex h-full focus:outline-none">
    {/* Main Content - Left Section */}
    <div className="flex-1 flex flex-col h-full p-6 pr-4 overflow-y-auto focus:outline-none">
      <DialogHeader className="mb-6 focus:outline-none">
        <div className="flex items-center justify-between focus:outline-none">
          <div className="flex items-center gap-3">
            {isEditingAgentName ? (
              <Input
                value={createAgentForm.name}
                onChange={(e) => setCreateAgentForm(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setIsEditingAgentName(false)
                  }
                }}
                onBlur={() => setIsEditingAgentName(false)}
                className="text-xl font-semibold border-0 p-0 h-auto focus:ring-0 bg-transparent outline-none focus:outline-none shadow-none"
                autoFocus
              />
            ) : (
              <DialogTitle 
                className="text-xl font-semibold cursor-text px-0 py-0"
                onDoubleClick={() => setIsEditingAgentName(true)}
              >
                {createAgentForm.name}
              </DialogTitle>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Schedule Information Display */}
            {createAgentSchedule.frequency && (
              <div className="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3 w-3 text-gray-600" />
                  <span className="font-medium text-gray-700 capitalize">{createAgentSchedule.frequency}</span>
                  <span className="text-gray-500">at {createAgentSchedule.time}</span>
                  {createAgentSchedule.frequency === 'weekly' && createAgentSchedule.selectedDay && (
                    <span className="text-gray-500">on {capitaliseFirstLetter(createAgentSchedule.selectedDay)}</span>
                  )}
                  {createAgentSchedule.frequency === 'monthly' && createAgentSchedule.days[0] && (
                    <span className="text-gray-500">on day {createAgentSchedule.days[0]}</span>
                  )}
                </div>
              </div>
            )}
            
            <TooltipProvider>
              <div className="flex items-center gap-2">
                {!isInquiriesLoggerMode && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowSmartCreateInput(!showSmartCreateInput)
                          }}
                          className="rounded-md h-8 w-8 p-0"
                        >
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Smart Create - Generate agent with AI</p>
                      </TooltipContent>
                    </Tooltip>


                  </>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                        className="rounded-md h-8 w-8 p-0"
              >
                <Clock className="h-4 w-4" />
              </Button>
              
              {/* Schedule Dropdown */}
              {showScheduleDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-20 p-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Frequency</Label>
                      <Select
                        value={createAgentSchedule.frequency}
                        onValueChange={(value) => 
                          setCreateAgentSchedule(prev => ({ 
                            ...prev, 
                            frequency: value,
                            days: value === 'daily' ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] : prev.days,
                            selectedDay: value === 'weekly' ? 'monday' : prev.selectedDay
                          }))
                        }
                      >
                        <SelectTrigger className="w-full rounded-md mt-1">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Time</Label>
                      <Input
                        type="time"
                        value={createAgentSchedule.time}
                        onChange={(e) => 
                          setCreateAgentSchedule(prev => ({ ...prev, time: e.target.value }))
                        }
                        className="w-full rounded-md mt-1"
                      />
                    </div>
                    
                    {createAgentSchedule.frequency === 'weekly' && (
                      <div>
                        <Label className="text-sm font-medium">Day of Week</Label>
                        <Select
                          value={createAgentSchedule.selectedDay}
                          onValueChange={(value) => 
                            setCreateAgentSchedule(prev => ({ ...prev, selectedDay: value, days: [value] }))
                          }
                        >
                          <SelectTrigger className="w-full rounded-md mt-1">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monday">Monday</SelectItem>
                            <SelectItem value="tuesday">Tuesday</SelectItem>
                            <SelectItem value="wednesday">Wednesday</SelectItem>
                            <SelectItem value="thursday">Thursday</SelectItem>
                            <SelectItem value="friday">Friday</SelectItem>
                            <SelectItem value="saturday">Saturday</SelectItem>
                            <SelectItem value="sunday">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {createAgentSchedule.frequency === 'monthly' && (
                      <div>
                        <Label className="text-sm font-medium">Day of Month</Label>
                        <Input
                          type="number"
                          min="1"
                          max="28"
                          placeholder="e.g., 1, 15"
                          value={createAgentSchedule.days[0] || ''}
                          onChange={(e) => 
                            setCreateAgentSchedule(prev => ({ ...prev, days: [e.target.value] }))
                          }
                          className="w-full rounded-md mt-1"
                        />
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowScheduleDropdown(false)}
                        className="rounded-md"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowScheduleDropdown(false)}
                        className="rounded-md"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Schedule - Set when agent runs</p>
                  </TooltipContent>
                </Tooltip>
                
                {!isInquiriesLoggerMode && (
                  <>
                    {/* Vertical Separator */}
                    <div className="h-6 w-px bg-gray-200 mx-2"></div>
                    
                    {/* Tools Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowToolsInLeftPanel(!showToolsInLeftPanel)}
                          className={cn(
                            "rounded-md h-8 w-8 p-0",
                            showToolsInLeftPanel && "bg-gray-100"
                          )}
                        >
                          <Puzzle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Tools - View available integrations</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </DialogHeader>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Agent Canvas */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold">Instructions</h3>
            {agentCanvasContent && typeof agentCanvasContent === 'string' && agentCanvasContent.trim() && isEditingCanvas && !showSmartCreateInput && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingCanvas(false)}
                className="rounded-md opacity-70 hover:opacity-100"
              >
                Done
              </Button>
            )}
          </div>

          {/* Smart Create Input */}
          {showSmartCreateInput && (
            <div className="mb-4">
              <div className={cn(
                "overflow-hidden transition-all duration-700 ease-in-out",
                isGeneratingSteps ? "max-h-0 opacity-0" : "max-h-[200px] opacity-100"
              )}>
                <Textarea
                  placeholder="What are you trying to achieve..."
                  value={smartCreatePrompt}
                  onChange={(e) => setSmartCreatePrompt(e.target.value)}
                  className="min-h-[120px] rounded-md focus:ring-0 focus:ring-offset-0"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      
                    if (!user?.uid) {
                      toast({
                        title: "Authentication Required",
                        description: "Please sign in to create agents.",
                        variant: "destructive"
                      })
                      return
                    }

                    if (!smartCreatePrompt.trim()) {
                      toast({
                        title: "Prompt Required",
                        description: "Please describe what you want the agent to do.",
                        variant: "destructive"
                      })
                      return
                    }

                    try {
                      setIsGeneratingSteps(true)
                      
                      console.log('🔧 [CreateAgent] Starting createAgentExecutionPlan call')
                      console.log('🔧 [CreateAgent] User ID:', user.uid)
                      console.log('🔧 [CreateAgent] Smart prompt:', smartCreatePrompt)
                      
                      toast({
                          title: "Generating Agent Definition",
                          description: "AI is creating your agent definition...",
                      })

                      const functions = getFunctions()
                      const createAgentExecutionPlan = httpsCallable(functions, 'createAgentExecutionPlan')
                      
                      console.log('🔧 [CreateAgent] Calling function with params:', {
                        prompt: smartCreatePrompt,
                        merchantId: user.uid
                      })
                      
                      const result = await createAgentExecutionPlan({
                        prompt: smartCreatePrompt,
                        merchantId: user.uid
                      })

                      console.log('🔧 [CreateAgent] Function call completed')
                      console.log('🔧 [CreateAgent] Raw result:', result)
                      
                      const data = result.data as any
                      console.log('🔧 [CreateAgent] Extracted data:', data)
                      console.log('🔧 [CreateAgent] Data type:', typeof data)
                      console.log('🔧 [CreateAgent] Data keys:', data ? Object.keys(data) : 'No data')
                        
                      // Store the full response for debugging
                      setCreateAgentDebugResponse(JSON.stringify(data, null, 2))
                      console.log('🔧 [CreateAgent] Debug response stored in UI')
                      if (data && data.promptv2) {
                          console.log('✅ [CreateAgent] Found promptv2:', data.promptv2)
                          setAgentCanvasContent(data.promptv2)
                          setIsEditingCanvas(false) // Exit edit mode to show formatted content
                          setShowSmartCreateInput(false)
                          setSmartCreatePrompt('')
                        
                          // Extract and store the agent description
                          if (data.executionPlan && data.executionPlan.agentDescription) {
                            console.log('✅ [CreateAgent] Found agentDescription:', data.executionPlan.agentDescription)
                            setAgentDescription(data.executionPlan.agentDescription)
                          }
                          
                          // Check if schedule information is provided in the response
                          if (data.executionPlan && data.executionPlan.schedule) {
                            console.log('✅ [CreateAgent] Found schedule information:', data.executionPlan.schedule)
                            const frequency = data.executionPlan.schedule.frequency || 'weekly'
                            let days = data.executionPlan.schedule.days || ['monday']
                            
                            // Ensure days array is populated correctly for daily frequency
                            if (frequency === 'daily' && (!days || days.length === 0)) {
                              days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                            }
                            
                            setCreateAgentSchedule({
                              frequency,
                              time: data.executionPlan.schedule.time || '07:00',
                              days,
                              selectedDay: days[0] || 'monday'
                            })
                          } else if (data.schedule) {
                            console.log('✅ [CreateAgent] Found direct schedule information:', data.schedule)
                            const frequency = data.schedule.frequency || 'weekly'
                            let days = data.schedule.days || ['monday']
                            
                            // Ensure days array is populated correctly for daily frequency
                            if (frequency === 'daily' && (!days || days.length === 0)) {
                              days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                            }
                            
                            setCreateAgentSchedule({
                              frequency,
                              time: data.schedule.time || '07:00',
                              days,
                              selectedDay: days[0] || 'monday'
                            })
                          }
                        
                          toast({
                            title: "Agent Definition Generated!",
                            description: "Review and edit the generated definition below.",
                          })
                      } else {
                        console.error('❌ [CreateAgent] No promptv2 found in response')
                        console.error('❌ [CreateAgent] Available fields:', data ? Object.keys(data) : 'No data object')
                        throw new Error('No promptv2 found in response')
                      }
                    } catch (error) {
                        console.error('❌ [CreateAgent] Error in createAgentExecutionPlan:', error)
                        console.error('❌ [CreateAgent] Error type:', error instanceof Error ? error.constructor.name : typeof error)
                        console.error('❌ [CreateAgent] Error message:', error instanceof Error ? error.message : String(error))
                        console.error('❌ [CreateAgent] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
                      toast({
                        title: "Generation Failed",
                          description: error instanceof Error ? error.message : "Failed to generate agent definition. Please try again.",
                        variant: "destructive"
                      })
                    } finally {
                      console.log('🔧 [CreateAgent] Cleaning up, setting isGeneratingSteps to false')
                      setIsGeneratingSteps(false)
                      }
                    }
                  }}
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>

              <div className={cn(
                "transition-all duration-700 ease-in-out",
                isGeneratingSteps ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 absolute"
              )}>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span 
                    className="font-medium relative"
                    style={{
                      background: 'linear-gradient(90deg, #007AFF, #5E6D7A, #8E8E93, #007AFF)',
                      backgroundSize: '200% 100%',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animation: 'gradient-shift 2s ease-in-out infinite'
                    }}
                  >
                    Generating...
                  </span>
                </div>
              </div>
              
              {!isGeneratingSteps && (
                <div className="mt-4 text-sm text-gray-900">
                  <h4 className="font-medium mb-2">How to prompt effectively:</h4>
                  <ul className="space-y-2 pl-4 list-disc">
                    <li>Be specific about what you want the agent to achieve</li>
                    <li>Include any specific tools you want to use (e.g., Gmail, Calendar)</li>
                    <li>Mention the frequency of execution if relevant (daily, weekly)</li>
                    <li>Include any specific data formats or outputs you need</li>
                    <li>Describe the problem you're solving rather than implementation details</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Agent Canvas or Tools Panel */}
          {!showSmartCreateInput && (
            <>
              {!showToolsInLeftPanel ? (
                <div className="relative flex-1" style={{ height: "auto", minHeight: "500px" }}>
                  {agentCanvasContent && typeof agentCanvasContent === 'string' && agentCanvasContent.trim() && !isEditingCanvas ? (
                    /* Display mode with tool highlighting - Moved outside container */
                    <div 
                      onDoubleClick={() => setIsEditingCanvas(true)} 
                      style={{ cursor: "pointer" }} 
                      className="h-[500px] overflow-y-auto py-1 text-sm leading-relaxed whitespace-pre-wrap [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300"
                    >
                      {renderTextWithTools(agentCanvasContent)}
                    </div>
                  ) : (
                    /* Edit mode - textarea */
                    <div className="relative h-full">
                      <Textarea
                        placeholder={`## Objective
Describe the main purpose and goal of your agent...

## Steps
1. First step the agent should take...
2. Second step the agent should take...
3. Continue adding steps...

## Tools Used
@gmail - For email operations
@calendar - For scheduling
@sheets - For data management
(Type @ to see available tools)`}
                        value={agentCanvasContent}
                        onChange={(e) => {
                          const value = e.target.value
                          setAgentCanvasContent(value)
                          
                          // Check for @ mentions
                          const cursorPosition = e.target.selectionStart
                          const textBeforeCursor = value.substring(0, cursorPosition)
                          const lastAtIndex = textBeforeCursor.lastIndexOf('@')
                          
                          if (lastAtIndex !== -1) {
                            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
                            // Show tools dropdown if @ is followed by word characters or is at the end
                            if (/^\w*$/.test(textAfterAt)) {
                              setShowToolsDropdown(true)
                              setToolsDropdownQuery(textAfterAt.toLowerCase())
                              setAtMentionPosition(lastAtIndex)
                            } else {
                              setShowToolsDropdown(false)
                            }
                          } else {
                            setShowToolsDropdown(false)
                          }
                        }}
                        onKeyDown={(e) => {
                          // Handle tool selection with Enter or Tab
                          if ((e.key === 'Enter' || e.key === 'Tab') && showToolsDropdown && filteredTools.length > 0) {
                            e.preventDefault()
                            const selectedTool = filteredTools[selectedToolIndex]
                            insertToolMention(selectedTool)
                          }
                          // Handle arrow keys for tool selection
                          else if (e.key === 'ArrowDown' && showToolsDropdown) {
                            e.preventDefault()
                            setSelectedToolIndex(prev => Math.min(prev + 1, filteredTools.length - 1))
                          }
                          else if (e.key === 'ArrowUp' && showToolsDropdown) {
                            e.preventDefault()
                            setSelectedToolIndex(prev => Math.max(prev - 1, 0))
                          }
                          // Hide dropdown on Escape
                          else if (e.key === 'Escape') {
                            setShowToolsDropdown(false)
                          }
                        }}
                        className="rounded-md h-[500px] text-sm leading-relaxed resize-none"
                        style={{ whiteSpace: 'pre-wrap' }}
                      />
                    </div>
                  )}
                  
                  {/* Tools Dropdown */}
                  {showToolsDropdown && (
                    <div className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
                         style={{
                           top: '200px', // Approximate position, you might want to calculate this dynamically
                           left: '20px',
                           minWidth: '200px'
                         }}>
                      {filteredTools.length > 0 ? (
                        filteredTools.map((tool, index) => (
                          <button
                            key={tool.slug}
                            onClick={() => insertToolMention(tool)}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                              index === selectedToolIndex ? 'bg-blue-50' : ''
                            }`}
                          >
                            {tool.deprecated?.toolkit?.logo ? (
                              <img
                                src={tool.deprecated.toolkit.logo}
                                alt={tool.toolkit?.name || tool.name}
                                className="w-4 h-4 rounded flex-shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-gray-600">
                                  {tool.name.charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium">
                                {tool.name.replace(/^(GMAIL_|GOOGLECALENDAR_|GOOGLEDOCS_|GOOGLESHEETS_)/i, '').toLowerCase().replace(/_/g, ' ')}
                              </div>
                              <div className="text-xs text-gray-500">{tool.toolkit?.name}</div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">No tools found</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Tools Panel */
                <div className="relative flex-1" style={{ height: "auto", minHeight: "500px" }}>
                  <div className="border border-gray-200 rounded-md h-[500px] overflow-y-auto p-4 bg-white [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700">Available Tools</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Select tools to use in your agent or mention them with @ in your agent definition.</p>
                    
                    {/* Tools Search */}
                    <div className="mb-4">
                      <Input
                        placeholder="Search tools..."
                        value={toolsSearchQuery}
                        onChange={(e) => setToolsSearchQuery(e.target.value)}
                        className="rounded-md h-8 text-sm"
                      />
                    </div>
                    
                    {/* Tools List with Descriptions */}
                    <div className="space-y-3">
                      {toolsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                          <span className="ml-2 text-xs text-gray-600">Loading tools...</span>
                        </div>
                      ) : composioTools.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-xs text-gray-500 mb-2">No connected tools</p>
                          <p className="text-xs text-gray-400">Connect integrations first</p>
                        </div>
                      ) : (
                        composioTools.map((tool) => (
                          <div 
                            key={tool.slug}
                            className={cn(
                              "border rounded-md p-3 transition-all duration-200",
                              selectedTools.has(tool.slug)
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            <div 
                              className="flex items-start gap-3 cursor-pointer"
                              onClick={() => {
                                const newSelected = new Set(selectedTools)
                                if (newSelected.has(tool.slug)) {
                                  newSelected.delete(tool.slug)
                                } else {
                                  newSelected.add(tool.slug)
                                }
                                setSelectedTools(newSelected)
                              }}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {tool.deprecated?.toolkit?.logo ? (
                                  <img
                                    src={tool.deprecated.toolkit.logo}
                                    alt={tool.toolkit?.name || tool.name}
                                    className="w-7 h-7 rounded-md"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  <div className="w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-600">
                                      {tool.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-sm font-medium text-gray-800 truncate">
                                    {tool.name.replace(/^(GMAIL_|GOOGLECALENDAR_|GOOGLEDOCS_|GOOGLESHEETS_)/i, '').toLowerCase().replace(/_/g, ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                  </h4>
                                  <div className="flex-shrink-0">
                                    <CheckCircle className={cn(
                                      "h-4 w-4 transition-opacity",
                                      selectedTools.has(tool.slug) ? "text-blue-500 opacity-100" : "text-gray-300 opacity-0"
                                    )} />
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 mb-1">{tool.description || "No description available"}</p>
                                {tool.toolkit && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    {tool.deprecated?.toolkit?.logo && (
                                      <img
                                        src={tool.deprecated.toolkit.logo}
                                        alt={tool.toolkit.name}
                                        className="w-3 h-3 rounded"
                                      />
                                    )}
                                    <span>{tool.toolkit.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

    {/* Vertical Separator */}
    <div className="w-px bg-gray-200"></div>
    {/* Right Sidebar */}
    <div className="w-80 p-6 pl-4 bg-gray-50 flex flex-col h-full">
      {/* Right Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {/* Notification Options */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3 text-gray-600">Notification Options</h3>
            
            <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Agent Inbox</p>
                    <p className="text-xs text-gray-500">Receive notifications in your agent inbox</p>
                  </div>
                  <Switch 
                    id="inbox-notification" 
                    checked={notificationSettings.sendToInbox}
                    onCheckedChange={(checked) => {
                      // If turning off inbox and email is also off, force email on
                      if (!checked && !notificationSettings.sendViaEmail) {
                        setNotificationSettings(prev => ({ 
                          ...prev, 
                          sendToInbox: false,
                          sendViaEmail: true 
                        }))
                      } else {
                        setNotificationSettings(prev => ({ ...prev, sendToInbox: checked }))
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive email updates when the agent runs</p>
                  </div>
                  <Switch 
                    id="email-notification" 
                    checked={notificationSettings.sendViaEmail}
                    onCheckedChange={(checked) => {
                      // If turning off email and inbox is also off, force inbox on
                      if (!checked && !notificationSettings.sendToInbox) {
                        setNotificationSettings(prev => ({ 
                          ...prev, 
                          sendViaEmail: false,
                          sendToInbox: true 
                        }))
                      } else {
                        setNotificationSettings(prev => ({ ...prev, sendViaEmail: checked }))
                      }
                    }}
                  />
                </div>
                
                {/* Email Settings - conditionally shown */}
                {notificationSettings.sendViaEmail && (
                  <div className="space-y-3 border-t border-gray-100 pt-3 mt-2">
                    <Label htmlFor="email-address" className="text-sm font-medium">Email Address</Label>
                    <Input 
                      id="email-address" 
                      placeholder="you@example.com" 
                      value={notificationSettings.emailAddress}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailAddress: e.target.value }))}
                      className="text-xs h-8 rounded-md bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">We'll send notifications to this email address</p>
                    
                    <div className="pt-2">
                      <Label htmlFor="email-format" className="text-sm font-medium">Email Format</Label>
                      {/* Sub-Tab Container */}
                      <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit mt-1">
                        <button
                          type="button"
                          onClick={() => setNotificationSettings(prev => ({ ...prev, emailFormat: "professional" }))}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                            notificationSettings.emailFormat === "professional"
                              ? "text-gray-800 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          <FileText className="h-3 w-3" />
                          Professional
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotificationSettings(prev => ({ ...prev, emailFormat: "simple" }))}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                            notificationSettings.emailFormat === "simple"
                              ? "text-gray-800 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          <AlignLeft className="h-3 w-3" />
                          Simple
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Selected Tools Details */}
          {selectedTools.size > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 text-gray-600">Selected Tools</h3>
              <div className="bg-white border border-gray-200 rounded-md shadow-sm max-h-40 overflow-y-auto">
                {Array.from(selectedTools).map(toolSlug => {
                  const tool = composioTools.find(t => t.slug === toolSlug)
                  if (!tool) return null
                  
                  return (
                    <div key={toolSlug} className="flex items-center gap-2 p-2 border-b border-gray-100 last:border-b-0">
                      {tool.deprecated?.toolkit?.logo ? (
                        <img
                          src={tool.deprecated.toolkit.logo}
                          alt={tool.toolkit?.name || tool.name}
                          className="w-5 h-5 rounded-md flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-5 h-5 bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {tool.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{tool.name}</p>
                        <p className="text-xs text-gray-500 truncate">{tool.toolkit?.name}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Debugging Section */}
          {createAgentDebugResponse && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3 text-gray-600">Debugging</h3>
              
              <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Debug Response Available</p>
                      <p className="text-xs text-gray-500">View detailed execution plan response</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDebugDialog(true)}
                      className="rounded-md h-8 text-xs"
                    >
                      <Bug className="w-3 h-3 mr-1" />
                      View Debug
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Selected Tools Details */}
        </div>

        {/* Create Button Section - Fixed at bottom */}
        <div className="border-t border-gray-200 pt-4 mt-auto sticky bottom-0 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              onClick={async () => {
                try {
                  setIsCreatingAgent(true)
                  
                  // Validate that schedule is set
                  if (!createAgentSchedule.frequency) {
                    toast({
                      title: "Schedule Required",
                      description: "Please select a schedule frequency before creating the agent.",
                      variant: "destructive"
                    })
                    setIsCreatingAgent(false)
                    return
                  }
                  
                  // Ensure days array is populated correctly for daily frequency
                  if (createAgentSchedule.frequency === 'daily' && (!createAgentSchedule.days || createAgentSchedule.days.length === 0)) {
                    createAgentSchedule.days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
                  }
                  
                  // Validate agentCanvasContent
                  if (!agentCanvasContent || typeof agentCanvasContent !== 'string' || !agentCanvasContent.trim()) {
                    toast({
                      title: "Agent Definition Required",
                      description: "Please define your agent in the canvas above.",
                      variant: "destructive"
                    })
                    setIsCreatingAgent(false)
                    return
                  }
                  
                  // Generate a unique schedule ID for this custom agent
                  const scheduleId = `${user?.uid}_custom_${Date.now()}`
                  
                  const agentData = {
                    agentName: createAgentForm.name,
                    type: 'custom',
                    status: 'active',
                    prompt: agentCanvasContent,
                    agentDescription: agentDescription || 'AI agent that executes multi-step tasks',
                    scheduleId: scheduleId, // Store reference to schedule document
                    appsUsed: Array.from(selectedTools), // Add appsUsed field to track connected apps
                    agentinbox: true, // Enable agent inbox functionality
                    settings: {
                      schedule: {
                        frequency: createAgentSchedule.frequency,
                        time: createAgentSchedule.time,
                        days: createAgentSchedule.days,
                        selectedDay: createAgentSchedule.selectedDay
                      },
                      selectedTools: Array.from(selectedTools),
                      notifications: {
                        sendToInbox: notificationSettings.sendToInbox,
                        sendViaEmail: notificationSettings.sendViaEmail,
                        emailAddress: notificationSettings.emailAddress,
                        emailFormat: notificationSettings.emailFormat
                      }
                    },
                    enrolledAt: new Date(),
                    lastUpdated: new Date()
                  }
                  
                  let agentDocRef;
                  
                  // If we're editing an existing agent, update it
                  if (selectedCustomAgent) {
                    const agentId = selectedCustomAgent.id
                    agentDocRef = doc(db, 'merchants', user?.uid || '', 'agentsenrolled', agentId)
                    
                    // Ensure agentId is set in the agent data
                    const updatedAgentData = {
                      ...agentData,
                      agentId: agentId // Explicitly set the agentId to the document ID
                    }
                    
                    await updateDoc(agentDocRef, updatedAgentData)
                    
                    // Also update the agentschedule collection
                    const scheduleRef = doc(db, 'agentschedule', selectedCustomAgent.scheduleId || scheduleId)
                    const scheduleData = {
                      merchantId: user?.uid,
                      agentname: createAgentForm.name,
                      agentId: agentId, // Use the document ID as agentId
                      agentName: createAgentForm.name,
                      schedule: updatedAgentData.settings.schedule,
                      enabled: true,
                      lastUpdated: new Date()
                    }
                    await updateDoc(scheduleRef, scheduleData).catch(async err => {
                      console.log('Schedule document may not exist, creating new one:', err.message)
                      // If update fails (document doesn't exist), create a new one
                      await setDoc(scheduleRef, {
                        ...scheduleData,
                        createdAt: new Date()
                      })
                    })
                    
                    toast({
                      title: "Agent Updated!",
                      description: `${createAgentForm.name} has been updated successfully.`
                    })
                  } else {
                    // Otherwise create a new agent
                    agentDocRef = await addDoc(collection(db, 'merchants', user?.uid || '', 'agentsenrolled'), agentData)
                    
                    // Update the agent document with its own ID as agentId
                    const agentId = agentDocRef.id
                    await updateDoc(agentDocRef, { agentId })
                    
                    // Also save schedule data to top-level agentschedule collection
                    const scheduleRef = doc(db, 'agentschedule', scheduleId)
                    const scheduleData = {
                      merchantId: user?.uid,
                      agentname: createAgentForm.name,
                      agentId: agentId, // Use the document ID as agentId
                      agentName: createAgentForm.name,
                      schedule: agentData.settings.schedule,
                      enabled: true,
                      createdAt: new Date(),
                      lastUpdated: new Date()
                    }
                    await setDoc(scheduleRef, scheduleData)
                    
                    toast({
                      title: "Agent Created!",
                      description: `${createAgentForm.name} has been created successfully.`
                    })
                  }
                  
                  // Refresh custom agents list
                  const customAgentsRef = collection(db, 'merchants', user?.uid || '', 'agentsenrolled')
                  const customAgentsQuery = query(customAgentsRef, orderBy('enrolledAt', 'desc'))
                  const refreshSnapshot = await getDocs(customAgentsQuery)
                  const refreshedCustomAgents = refreshSnapshot.docs
                    .map(doc => ({
                      id: doc.id,
                      ...doc.data()
                    }))
                    .filter((agent: any) => agent.type === 'custom')
                  setCustomAgents(refreshedCustomAgents)
                
                  // Reset form and close modal
                  setSelectedCustomAgent(null)
                  setCreateAgentForm({ name: 'New Agent', steps: [''] })
                  setCreateAgentSchedule({ frequency: '', time: '12:00', days: [], selectedDay: '' })
                  setSelectedTools(new Set())
                  setToolsSearchQuery('')
                  setSmartCreatePrompt('')
                  setShowSmartCreateInput(false)
                  setAgentCanvasContent('')
                  setAgentDescription('')
                  setShowToolsDropdown(false)
                  setToolsDropdownQuery('')
                  setSelectedToolIndex(0)
                  setFilteredTools([])
                  setAtMentionPosition(0)
                  setCreateAgentDebugResponse(null)
                  setIsCreateAgentModalOpen(false)
                } catch (error) {
                  console.error('Error saving agent:', error)
                  toast({
                    title: "Error",
                    description: "Failed to save agent. Please try again.",
                    variant: "destructive"
                  })
                } finally {
                  setIsCreatingAgent(false)
                }
              }}
              disabled={isCreatingAgent || !agentCanvasContent || typeof agentCanvasContent !== 'string' || !agentCanvasContent.trim() || !createAgentForm.name.trim() || !createAgentSchedule.frequency}
              className="rounded-md px-4 py-1.5 h-auto text-sm"
              size="sm"
            >
              {isCreatingAgent ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  {selectedCustomAgent ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                selectedCustomAgent ? 'Update Agent' : 'Create Agent'
              )}
            </Button>
            
            {selectedCustomAgent && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  try {
                    if (confirm("Are you sure you want to delete this agent? This action cannot be undone.")) {
                      const agentId = selectedCustomAgent.id
                      
                      // Delete the agent from agentsenrolled collection
                      await deleteDoc(doc(db, 'merchants', user?.uid || '', 'agentsenrolled', agentId))
                      
                      // Also delete from the top-level agentschedule collection if it exists
                      if (selectedCustomAgent.scheduleId) {
                        const scheduleRef = doc(db, 'agentschedule', selectedCustomAgent.scheduleId)
                        await deleteDoc(scheduleRef).catch(err => {
                          // Ignore errors if the schedule document doesn't exist
                          console.log('Schedule may not exist or was already deleted:', err.message)
                        })
                      }
                      
                      toast({
                        title: "Agent Deleted",
                        description: `${selectedCustomAgent.agentName} has been deleted successfully.`
                      })
                      
                      // Refresh custom agents list
                      await loadCustomAgents()
                      
                      // Reset form and close modal
                      setSelectedCustomAgent(null)
                      setCreateAgentForm({ name: 'New Agent', steps: [''] })
                      setCreateAgentSchedule({ frequency: '', time: '12:00', days: [], selectedDay: '' })
                      setSelectedTools(new Set())
                      setToolsSearchQuery('')
                      setSmartCreatePrompt('')
                      setShowSmartCreateInput(false)
                      setAgentCanvasContent('')
                      setAgentDescription('')
                      setShowToolsDropdown(false)
                      setToolsDropdownQuery('')
                      setSelectedToolIndex(0)
                      setFilteredTools([])
                      setAtMentionPosition(0)
                      setCreateAgentDebugResponse(null)
                      setIsCreateAgentModalOpen(false)
                    }
                  } catch (error) {
                    console.error('Error deleting agent:', error)
                    toast({
                      title: "Error",
                      description: "Failed to delete agent. Please try again.",
                      variant: "destructive"
                    })
                  }
                }}
                className="rounded-md px-4 py-1.5 h-auto text-sm"
              >
                Delete Agent
              </Button>
            )}
            
            {!selectedCustomAgent && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    // Using httpsCallable for Firebase Functions automatically handles CORS
                    const functions = getFunctions()
                    const triggerAgentExecution = httpsCallable(functions, 'triggerAgentExecution')
                    
                    // Create a random agent ID with a prefix
                    const randomAgentId = "test-agent-" + Math.random().toString(36).substring(2, 8)
                    
                    // Prepare payload exactly as the function expects
                    const payload = {
                      merchantId: user?.uid || "abc123",
                      agentId: randomAgentId,
                      prompt: agentCanvasContent
                    }
                    
                    toast({
                      title: "Testing Agent",
                      description: "Triggering agent execution...",
                    })
                    
                    // Call the function with the payload
                    const result = await triggerAgentExecution(payload)
                    
                    toast({
                      title: "Test Initiated",
                      description: "Agent execution has been triggered successfully.",
                    })
                    
                    console.log("Agent execution result:", result.data)
                  } catch (error) {
                    console.error("Error triggering agent:", error)
                    toast({
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to trigger agent execution. Please try again.",
                      variant: "destructive"
                    })
                  }
                }}
                className="rounded-md px-4 py-1.5 h-auto text-sm"
              >
                Test
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  </DialogPrimitive.Content>
</DialogPortal>
</Dialog>

{/* Debug Dialog */}
{createAgentDebugResponse && (
<Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
  <DialogPortal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden p-6">
      <DialogPrimitive.Title className="sr-only">Debug Information</DialogPrimitive.Title>
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
      <div>
        <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
          <h3 className="text-sm font-medium mb-2 text-gray-700">createAgentExecutionPlan Response</h3>
          <pre className="text-xs overflow-auto bg-white p-3 rounded-md max-h-[60vh] text-gray-700 whitespace-pre-wrap border border-gray-100 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
            {createAgentDebugResponse}
          </pre>
        </div>
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setShowDebugDialog(false);
              setCreateAgentDebugResponse(null);
            }}
            className="rounded-md"
          >
            Clear & Close
          </Button>
        </div>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
</Dialog>
)}
