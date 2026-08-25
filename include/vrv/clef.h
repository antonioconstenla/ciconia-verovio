/////////////////////////////////////////////////////////////////////////////
// Name:        clef.h
// Author:      Laurent Pugin
// Created:     2011
// Copyright (c) Authors and others. All rights reserved.
/////////////////////////////////////////////////////////////////////////////

#ifndef __VRV_CLEF_H__
#define __VRV_CLEF_H__

#include "atts_externalsymbols.h"
#include "atts_shared.h"
#include "layerelement.h"
#include "offsetinterface.h"
#include "vrvdef.h"

namespace vrv {

class ScoreDefInterface;

//----------------------------------------------------------------------------
// Clef
//----------------------------------------------------------------------------

/**
 * This class models the MEI <clef> element.
 */
class Clef : public LayerElement,
             public OffsetInterface,
             public AttClefLog,
             public AttClefShape,
             public AttColor,
             public AttEnclosingChars,
             public AttExtSymAuth,
             public AttExtSymNames,
             public AttLineLoc,
             public AttOctave,
             public AttOctaveDisplacement,
             public AttStaffIdent,
             public AttTypography,
             public AttVisibility {
public:
    /**
     * @name Constructors, destructors, and other standard methods
     * Reset method resets all attribute classes.
     */
    ///@{
    Clef();
    virtual ~Clef();
    Object *Clone() const override { return new Clef(*this); }
    void Reset() override;
    std::string GetClassName() const override { return "clef"; }
    ///@}

    /**
     * @name Getter to interfaces
     */
    ///@{
    OffsetInterface *GetOffsetInterface() override { return vrv_cast<OffsetInterface *>(this); }
    const OffsetInterface *GetOffsetInterface() const override { return vrv_cast<const OffsetInterface *>(this); }
    ///@}

    /** Override the method since alignment is required */
    bool HasToBeAligned() const override { return true; }

    /** Override the method since check is required */
    bool IsScoreDefElement() const override { return (this->GetParent() && this->GetFirstAncestor(SCOREDEF)); }

    /**
     * @name Drawing absorption into the staffDef system-start clef.
     * When true, this layer clef was promoted to m_staffDefClef for SCOREDEF
     * alignment/drawing; the layer instance must not align or draw again.
     */
    ///@{
    void SetDrawingAbsorbedIntoStaffDef(bool absorbed) { m_drawingAbsorbedIntoStaffDef = absorbed; }
    bool IsDrawingAbsorbedIntoStaffDef() const { return m_drawingAbsorbedIntoStaffDef; }
    ///@}

    /**
     * Return the offset of the clef
     */
    int GetClefLocOffset() const;

    //----------------//
    // Static methods //
    //----------------//

    /**
     * Retrieves the appropriate SMuFL code for a data_CLEFSHAPE
     */
    char32_t GetClefGlyph(const data_NOTATIONTYPE notationType) const;

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

private:
    //
public:
    //
private:
    /**
     * True when this layer clef is drawn via the staffDef system-start sidecar
     * instead of as an ordinary inline ALIGNMENT_CLEF.
     */
    bool m_drawingAbsorbedIntoStaffDef;
};

} // namespace vrv

#endif
