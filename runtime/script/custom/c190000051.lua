-- Gate Guardian-F: Fusion Summon using the three original Gate Guardian pieces.
local s,id=GetID()
function s.initial_effect(c)
	c:EnableReviveLimit()
	Fusion.AddProcMix(c,false,true,25955164,62340868,98434877)
end
