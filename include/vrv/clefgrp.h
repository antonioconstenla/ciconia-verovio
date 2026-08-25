/////////////////////////////////////////////////////////////////////////////
// Name:        clefgrp.h
// Author:      Ciconia
// Created:     2026
// Copyright (c) Authors and others. All rights reserved.
/////////////////////////////////////////////////////////////////////////////

#ifndef __VRV_CLEFGRP_H__
#define __VRV_CLEFGRP_H__

#include "layerelement.h"

namespace vrv {

//----------------------------------------------------------------------------
// ClefGrp
//----------------------------------------------------------------------------

/**
 * This class models the MEI <clefGrp> element.
 * A container of equal-compatible <clef> children drawn at a shared system-start X,
 * each anchored to its own staff line (e.g. C4 above F2).
 */
class ClefGrp : public LayerElement {
public:
    /**
     * @name Constructors, destructors, and other standard methods
     * Reset method reset all attribute classes
     */
    ///@{
    ClefGrp();
    virtual ~ClefGrp();
    Object *Clone() const override { return new ClefGrp(*this); }
    void Reset() override;
    std::string GetClassName() const override { return "clefGrp"; }
    ///@}

    /**
     * Add childElement to a element.
     */
    bool IsSupportedChild(ClassId classId) override;

    //----------//
    // Functors //
    //----------//

    /**
     * Interface for class functor visitation
     */
    ///@{
    FunctorCode Accept(Functor &functor) override;
    FunctorCode Accept(ConstFunctor &functor) const override;
    FunctorCode AcceptEnd(Functor &functor) override;
    FunctorCode AcceptEnd(ConstFunctor &functor) const override;
    ///@}

protected:
    //
private:
    //
public:
    //
private:
    //
};

} // namespace vrv

#endif
