/////////////////////////////////////////////////////////////////////////////
// Name:        clefgrp.cpp
// Author:      Ciconia
// Created:     2026
// Copyright (c) Authors and others. All rights reserved.
/////////////////////////////////////////////////////////////////////////////

#include "clefgrp.h"

//----------------------------------------------------------------------------

#include <algorithm>
#include <cassert>
#include <vector>

//----------------------------------------------------------------------------

#include "clef.h"
#include "editorial.h"
#include "functor.h"
#include "vrv.h"

namespace vrv {

//----------------------------------------------------------------------------
// ClefGrp
//----------------------------------------------------------------------------

static const ClassRegistrar<ClefGrp> s_factory("clefGrp", CLEFGRP);

ClefGrp::ClefGrp() : LayerElement(CLEFGRP)
{
    this->Reset();
}

ClefGrp::~ClefGrp() {}

void ClefGrp::Reset()
{
    LayerElement::Reset();
}

bool ClefGrp::IsSupportedChild(ClassId classId)
{
    static const std::vector<ClassId> supported{ CLEF };

    if (std::find(supported.begin(), supported.end(), classId) != supported.end()) {
        return true;
    }
    else if (Object::IsEditorialElement(classId)) {
        return true;
    }
    else {
        return false;
    }
}

FunctorCode ClefGrp::Accept(Functor &functor)
{
    return functor.VisitClefGrp(this);
}

FunctorCode ClefGrp::Accept(ConstFunctor &functor) const
{
    return functor.VisitClefGrp(this);
}

FunctorCode ClefGrp::AcceptEnd(Functor &functor)
{
    return functor.VisitClefGrpEnd(this);
}

FunctorCode ClefGrp::AcceptEnd(ConstFunctor &functor) const
{
    return functor.VisitClefGrpEnd(this);
}

} // namespace vrv
