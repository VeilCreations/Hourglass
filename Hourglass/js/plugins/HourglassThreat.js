//=============================================================================
// RPG Maker MZ - Hourglass Threat System
//=============================================================================
const Imported = Imported || {};
Imported['Hourglass - Threat'] = '1.0';

const Hourglass = Hourglass || {};
Hourglass.Threat = Hourglass.Threat || {};

/*:
 * @target MZ
 * @plugindesc MMO-style threat generation with extra features.
 * @author Christian Roach
 *
 * @help HourglassThreat.js
 * 
 * This plugin enables certain players and actions to generate different
 * levels of threat during combat.
 * 
 * It does not provide plugin commands.
 */

(() => {
    //=========================================================================
    // Game_Actor
    //=========================================================================
    Hourglass.Threat.initMembers = Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = () => {
        Hourglass.Threat.initMembers.call(this);
        this._threat = 0;
    };

    Hourglass.Threat.setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = actorId => {
        Hourglass.Threat.setup.call(this, actorId);
        const actor = this.actor();
        //TODO: additional calculation needed for balance
        this._threat = this._level * 100 * this.tgr;
    };

    Game_Actor.prototype.threat = () => {
        return this._threat;
    };

    Game_Actor.prototype.addThreat = value => {
        if (this.threatPercentage() < 99) {
            this._threat += (Math.abs(value) * this.tgr);
        }
    };

    Game_Actor.prototype.removeThreat = value => {
        this._threat -= Math.abs(value) / this.tgr;
        if (this._threat < 0) {
            this._threat = 0;
        }
    };

    Game_Actor.prototype.addDefaultThreat = value => {
        this.addThreat(this._level * 50);
    };

    Game_Actor.prototype.threatPercentage = value => {
        return Math.round((this.threat() / this.friendsUnit().threatSum()) * 100);
    };

    //=========================================================================
    // Game_Action
    //=========================================================================
    Hourglass.Threat.executeDamage = Game_Action.prototype.executeDamage;
    Game_Action.prototype.executeDamage = (target, value) => {
        Hourglass.Threat.executeDamage.call(this, target, value);
        if (this.isSkill()) {
            //TODO: this.value += this.item().get threat value from note tags
        }
        if (this.subject().isActor()) {
            this.subject().addThreat(value);
        }
    };

    Hourglass.Threat.itemEffectRecoverHp = Game_Action.prototype.itemEffectRecoverHp;
    Game_Action.prototype.itemEffectRecoverHp = (target, effect) => {
        Hourglass.Threat.itemEffectRecoverHp.call(this, target, effect);
        let value = (target.mhp * effect.value1 + effect.value2);
        if (this.isItem()) {
            value *= this.subject().pha;
        }
        value = Math.floor(value);
        if (value !== 0) {
            this.subject().addThreat(value);
        }
    };

    Hourglass.Threat.itemEffectAddNormalState = Game_Action.prototype.itemEffectAddNormalState;
    Game_Action.prototype.itemEffectAddNormalState = (target, effect) => {
        Hourglass.Threat.itemEffectAddNormalState.call(this, target, effect);
        if (this.subject().isActor() && !this.isGuard() && this.target.result().success === true) {
            if (this.item().threat) {
                this.subject().addThreat(this.item().threat);
            } else {
                this.subject().addDefaultThreat();
            }
        }
    };

    Hourglass.Threat.apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = target => {
        Hourglass.Threat.apply.call(this, target);
        const result = target.result();
        if (result.evaded === true && target.isActor()) {
            //TODO: if subject has aggro profile 'Ego', add threat
            target.removeThreat(target._level * 50);
        }
    };

    //=========================================================================
    // Game_Party
    //=========================================================================
    Game_Party.prototype.threatSum = () => {
        return this.aliveMembers().reduce((r, member) => {
            return r + member.threat();
        }, 0);
    };

    //TODO: seperate random friendly unit from random enemy. (Heal random ally shouldnt take threat into account)
    Game_Party.prototype.randomTarget = () => {
        let threatRand = Math.random() * this.threatSum();
        let target = null;
        this.aliveMembers().forEach((member) => {
            threatRand -= member.threat();
            if (threatRand <= 0 && !target) {
                target = member;
            }
        });
        return target;
    };

    //=========================================================================
    // Window_Base
    //=========================================================================
    Window_Base.prototype.drawActorThreat = (actor, x, y, width) => {
        width = width || 168;
        this.changeTextColor(this.threatColor(actor.threatPercentage()));
        this.drawText(actor.threatPercentage()+'%', x, y, width);
    };

    Window_Base.prototype.threatColor = threat => {
        if (threat >=75) {
            return this.crisisColor();
        } else {
            return this.normalColor();
        }
    };

    //=========================================================================
    // Window_BattleStatus
    //=========================================================================
    Hourglass.Threat.drawBasicArea = Window_BattleStatus.prototype.drawBasicArea;
    Window_BattleStatus.prototype.drawBasicArea = (rect, actor) => {
        Hourglass.Threat.drawBasicArea.call(this, rect, actor);
        this.drawActorThreat(actor, rect.x + 156, rect.y, rect.width - 156);
    };
})();
